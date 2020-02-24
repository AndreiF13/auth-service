const assert = require('assert');
const Permission = require('../../domain/models/permission.class');
const Role = require('../../domain/models/role.class');
const Organization = require('../../domain/models/organization.class');
const OrganizationError = require('../../domain/errors/organization.error');

describe('Organization class unit test', function () {
    const name = 'Risto';
    const perm = new Permission('auth-service', 'addRole');
    const role = new Role('waiter', [perm]);
    const userId = 'user1';
    const orgId =  'id1';

    it('check constructor works', function () {
        assert.throws(() => new Organization(), OrganizationError);
        assert.throws(() => new Organization(''), OrganizationError);
        assert.throws(() => new Organization({}), OrganizationError);

        const org = new Organization(name);
        assert.strictEqual(org.name, name);
        assert.ok(typeof org.orgId === 'string');
    });

    it('check delete works', function () {
        const org = new Organization(name);
        org.delete();
        assert.strictEqual(org.status, 'deleted');
        assert.ok(org.isDeleted());
        assert.throws(() => org.delete(), OrganizationError);
    });

    it('check addRole works', function () {
        let org = new Organization(name);
        assert.throws(() => org.addRole(), OrganizationError);
        assert.throws(() => org.addRole('aa'), OrganizationError);
        assert.throws(() => org.addRole({}), OrganizationError);
        org.delete();
        assert.throws(() => org.addRole(role), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        assert.deepStrictEqual(org.roles, [role]);
    });

    it('check getRole works', function () {
        let org = new Organization(name);
        assert.throws(() => org.getRole(), OrganizationError);
        assert.throws(() => org.getRole('aa'), OrganizationError);
        assert.throws(() => org.getRole({}), OrganizationError);
        org.delete();
        assert.throws(() => org.getRole(role.roleId), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        const roleRetrieved = org.getRole(role.roleId);
        assert.deepStrictEqual(roleRetrieved, role);
    });

    it('check removeRole works', function () {
        let org = new Organization(name);
        assert.throws(() => org.removeRole(), OrganizationError);
        assert.throws(() => org.removeRole('aa'), OrganizationError);
        assert.throws(() => org.removeRole({}), OrganizationError);
        org.delete();
        assert.throws(() => org.removeRole(role.roleId), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        org.removeRole(role.roleId);
        assert.deepStrictEqual(org.roles, []);
        assert.deepStrictEqual(org.roles, []);
    });

    it('check addUser works', function () {
        let org = new Organization(name);
        assert.throws(() => org.addUser(), OrganizationError);
        assert.throws(() => org.addUser({}), OrganizationError);
        org.delete();
        assert.throws(() => org.addUser(userId), OrganizationError);

        org = new Organization(name);
        org.addUser(userId);
        let expected = {
            userId,
            roles: [],
        };
        assert.deepStrictEqual(org.users, [expected]);
        assert.throws(() => org.addUser(userId), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        org.addUser(userId, [role.roleId]);
        expected = {
            userId,
            roles: [role.roleId],
        };
        assert.deepStrictEqual(org.users, [expected]);
    });

    it('check assignRolesToUser works', function () {
        let org = new Organization(name);
        org.addRole(role);
        org.addUser(userId);
        assert.throws(() => org.assignRolesToUser(), OrganizationError);
        assert.throws(() => org.assignRolesToUser('aa'), OrganizationError);
        assert.throws(() => org.assignRolesToUser({}), OrganizationError);
        assert.throws(() => org.assignRolesToUser(userId), OrganizationError);
        assert.throws(() => org.assignRolesToUser(userId, {}), OrganizationError);
        assert.throws(() => org.assignRolesToUser(userId, role), OrganizationError);
        assert.throws(() => org.assignRolesToUser(userId, [role]), OrganizationError);
        org.delete();
        assert.throws(() => org.assignRolesToUser(userId, [role.roleId]), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        org.addUser(userId);
        org.assignRolesToUser(userId, [role.roleId]);
        const expected = {
            userId,
            roles: [role.roleId],
        };
        assert.deepStrictEqual(org.users, [expected]);
    });

    it('check removeRolesFromUser works', function () {
        let org = new Organization(name);
        org.addRole(role);
        org.addUser(userId);
        assert.throws(() => org.removeRolesFromUser(), OrganizationError);
        assert.throws(() => org.removeRolesFromUser('aa'), OrganizationError);
        assert.throws(() => org.removeRolesFromUser({}), OrganizationError);
        assert.throws(() => org.removeRolesFromUser(userId), OrganizationError);
        assert.throws(() => org.removeRolesFromUser(userId, role), OrganizationError);
        assert.throws(() => org.removeRolesFromUser(userId, [role]), OrganizationError);
        org.delete();
        assert.throws(() => org.removeRolesFromUser(userId, [role.roleId]), OrganizationError);

        org = new Organization(name);
        org.addRole(role);
        org.addUser(userId);
        org.assignRolesToUser(userId, [role.roleId]);
        org.removeRolesFromUser(userId, [role.roleId]);
        const expected = {
            userId,
            roles: [],
        };
        assert.deepStrictEqual(org.users, [expected]);
    });

    it('check removeUser works', function () {
        let org = new Organization(name);
        assert.throws(() => org.removeUser(), OrganizationError);
        assert.throws(() => org.removeUser('aa'), OrganizationError);
        assert.throws(() => org.removeUser({}), OrganizationError);
        org.delete();
        assert.throws(() => org.removeUser(userId), OrganizationError);

        org = new Organization(name);
        org.addUser(userId);
        org.removeUser(userId);
        assert.deepStrictEqual(org.users, []);
    });

    it('check fromObject works', function () {
        assert.throws(() => Organization.fromObject(), OrganizationError);

        const obj1 = {
            orgId,
            name,
        }
        const org1 = Organization.fromObject(obj1);
        assert.strictEqual(org1.orgId, orgId);
        assert.strictEqual(org1.name, name);
        assert.deepStrictEqual(org1.roles, []);
        assert.deepStrictEqual(org1.users, []);

        const obj2 = {
            orgId,
            name,
            roles: [JSON.parse(JSON.stringify(role))],
            users: [{
                userId,
                roles: [role.roleId]
            }],
        }
        const org2 = Organization.fromObject(obj2);
        assert.strictEqual(org2.orgId, orgId);
        assert.strictEqual(org2.name, name);
        assert.deepStrictEqual(org2.roles, [role]);
        const userExpected = {
            userId,
            roles: [role.roleId],
        };
        assert.deepStrictEqual(org2.users, [userExpected]);
    });

    it('check toJSON works', function () {
        let org = new Organization(name);
        let json = org.toJSON();
        let expected = {
            name
        };
        assert.strictEqual(typeof json.orgId, 'string')
        assert.notStrictEqual(json.orgId.length, 0);
        delete json.orgId;
        assert.deepStrictEqual(json, expected);

        org = new Organization(name);
        org.addRole(role);
        org.addUser(userId, [role.roleId]);

        expected = {
            name,
            roles: [role],
            users: [{
                userId,
                roles: [role.roleId]
            }],
        };
        json = org.toJSON();
        assert.strictEqual(typeof json.orgId, 'string')
        assert.notStrictEqual(json.orgId.length, 0);
        delete json.orgId
        assert.deepStrictEqual(json, expected);
    });
});
