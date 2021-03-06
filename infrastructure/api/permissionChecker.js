const JWTSecureFunc = require('@danver97/jwt-secure');
const ApiError = require('./api.error');
const PermissionDefinition = require('../../domain/models/permissionDef.class');

// const jwts = new JWTSecure({ rsabit: 2048, algo: 'RS512', rotationInterval: 30, keyExpirationInterval: 30 });
let Signer;
let jwts;

function init() {
    const JWTSecure = JWTSecureFunc(Signer);
    switch (Signer) {
        case 'aws':
            const oneDaySeconds = 60*60*24;
            jwts = new JWTSecure({ rsabit: 2048, algo: 'RS512', rotationInterval: oneDaySeconds, keyExpirationInterval: 7 });
            break;
        case 'test':
            jwts = new JWTSecure({ rsabit: 2048, algo: 'RS512', rotationInterval: 30, keyExpirationInterval: 30 });
            break;
        default:
            throw new Error(`JWTSigner not supported. Supported values 'aws', 'test'. Found: ${Signer}`);
    }
    return jwts.init();
}

async function signJWT(payload) {
    const expInOneHour = new Date();
    expInOneHour.setHours(expInOneHour.getHours() + 1);
    payload = Object.assign({
        exp: payload.exp || expInOneHour.getTime(), // expInOneHour.toISOString(),
    }, payload);
    const token = await jwts.sign(payload);
    return token;
}

async function verifyToken(req, res, next) {
    if (req.jwtPayload) {
        // console.log('token request already verified and decoded.');
        next();
        return;
    }
    const value = req.header('Authorization');
    const tokenRegExp = /^Bearer (.+)$/;
    let token;
    if (tokenRegExp.test(value))
        token = tokenRegExp.exec(value)[1];
    if (!token) {
        const err = ApiError.noTokenError('Missing jwt token');
        next(err);
        return;
    }
    let jwtPayload;
    try {
        jwtPayload = await jwts.verify(token);
    } catch (err) {
        console.log(err);
        err = ApiError.invalidTokenError('Token is invalid');
        next(err);
        return;
    }
    req.token = token;
    req.jwtPayload = jwtPayload;
    if (!jwtPayload.exp || (new Date(jwtPayload.exp)).getTime() < Date.now()) {
        const err = ApiError.tokenExpiredError('Token has expired');
        next(err);
        return;
    }
    
    next();
}

/**
 * @param {object} options
 * @param {PermissionDefinition} options.permissionDefs
 * @param {object} options.params
 */
function checkPermission(options) {
    if (!options)
        throw new Error(`Missing parameters: options`);
    const { permissionDefs = [], params = [] } = options;
    if (!Array.isArray(permissionDefs) || (permissionDefs.length > 0 && !(permissionDefs[0] instanceof PermissionDefinition)))
        throw new Error(`permissionDefs must be an array of PermissionDefinition`);

    return [verifyToken, function (req, res, next) {        
        if (!req.jwtPermissions) {
            req.jwtPermissions = new Map();
            req.jwtPayload.roles = req.jwtPayload.roles || {};
            
            Object.keys(req.jwtPayload.roles).map(k => {
                const rolesList = req.jwtPayload.roles[k];
                if (Array.isArray(rolesList))
                    return rolesList.map(r => r.permissions);
                return [rolesList.permissions]
            }).flat(3).forEach(p => {
                req.jwtPermissions.set(p.name, p);
            });
        }
        
        let hasPermission = false;
        for (let permDef of permissionDefs) {
            if (!req.jwtPermissions.has(permDef.name))
                continue;
            const perm = req.jwtPermissions.get(permDef.name);
            let hasParams = true;
            for (let p of params) {
                const pVal = req.params[p] || req[p];
                if (perm.parameters[p] !== pVal) {
                    hasParams = false;
                    break;
                }
            }
            hasPermission = hasPermission || hasParams;
        }
        
        if (!hasPermission) {
            const err = ApiError.notAuthorizedError('User doesn\'t have the role or the permission');
            next(err);
            return;
        }
        next();
    }];
}

function exportFunc(JWTSigner) {
    console.log('Signer:', JWTSigner)
    Signer = JWTSigner;

    return {
        init,
        signJWT,
        verifyToken,
        checkPermission,
    }
}

module.exports = exportFunc;
