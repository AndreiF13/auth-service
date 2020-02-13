const uuid = require('uuid/v4');
const Role = require('./role.class');
const OrganizationError = require('../errors/organization.error');

class Organization {
    /**
     * @constructor
     * @param {string} name The name of the organization
     */
    constructor(name) {
        this.orgId = uuid();
        this.name = name;
        this._roles = {};
        this._users = {}; // Keeps track of users id of the organization and their roles
    }

    isDeleted() {
        return this.status === 'deleted';
    }

    delete() {
        this.status = 'deleted';
    }

    _checkIfDeleted() {
        if (this.isDeleted())
            throw new OrganizationError.organizationDeletedError('Organization is deleted and no more action can be taken on it');
    }

    /**
     * Adds a new Role to the Organization. If already present throws an error.
     * @param {Role} role The role to add to the organization
     */
    addRole(role) {
        this._checkIfDeleted();
        if (!(role instanceof Role))
            throw OrganizationError.paramError('role must be an instance of Role');
        if (this._roles[role.roleId])
            throw OrganizationError.roleAlreadyExistsError(`role with id ${role.roleId} already exists`);
        this._roles[role.roleId] = role;
    }

    /**
     * Removes an existing Role from the Organization.  
     * If not present, throws an error.
     * @param {string} roleName Name identifying the role to remove
     */
    removeRole(roleId) {
        this._checkIfDeleted();
        if (typeof roleId !== 'string')
            throw OrganizationError.paramError('roleId must be a string');
        delete this._roles[roleId];
    }

    /**
     * Adds a new user to the Organization, assigning the indicated roles to it if present.  
     * If user is already in the organization, throws an error.
     * @param {string} userId The id of the user to add
     * @param {string[]} [roles] An array of role ids
     */
    addUser(userId, roles) {
        this._checkIfDeleted();
        if (typeof userId !== 'string')
            throw OrganizationError.paramError('userId must be a string');
        if (this._users[userId])
            throw OrganizationError.userAlreadyExistsError(`user with id ${userId} already exists in the organization`);
        this._users[userId] = new Set();
        if (roles)
            this.assignRoles(userId, roles);
    }

    /**
     * Assigns the indicated roles to the user.  
     * If user is not present in the Organization, throws an error.  
     * If some role does not exist in the Organization, throws an error.
     * @param {string} userId The id of the user to which assign the roles
     * @param {string[]} roles An array of role ids
     */
    assignRolesToUser(userId, roles) {
        this._checkIfDeleted();
        if (typeof userId !== 'string')
            throw OrganizationError.paramError('userId must be a string');
        if (!this._users[userId])
            throw OrganizationError.userDoesNotExistError(`user with id ${userId} does not exist in the organization`);
        if (!Array.isArray(roles) || roles.length <= 0 || typeof roles[0] !== 'string')
            throw OrganizationError.paramError('roles must be a non empty array of role names');
        roles.forEach(r => {
            if (!this._roles[r])
                throw OrganizationError.roleDoesNotExistError(`role ${r} does not exist in the organization`);
            this._users[userId].add(r);
        });
    }

    /**
     * Removes the indicated roles from the user.  
     * If user is not present in the Organization, throws an error.  
     * If some role does not exist in the Organization, throws an error.
     * @param {string} userId The id of the user to which remove the roles
     * @param {string[]} roles An array of role ids
     */
    removeRolesFromUser(userId, roles) {
        this._checkIfDeleted();
        if (typeof userId !== 'string')
            throw OrganizationError.paramError('userId must be a string');
        if (!this._users[userId])
            throw OrganizationError.userDoesNotExistError(`user with id ${userId} does not exist in the organization`);
        if (!Array.isArray(roles) || roles.length <= 0 || typeof roles[0] !== 'string')
            throw OrganizationError.paramError('roles must be a non empty array of role names');
        roles.forEach(r => {
            if (!this._roles[r])
                throw OrganizationError.roleDoesNotExistError(`role ${r} does not exist in the organization`);
            this._users[userId].delete(r);
        });
    }

    /**
     * Removes an user from the Organization
     * @param {string} userId The id of the user to remove from the Organization
     */
    removeUser(userId) {
        this._checkIfDeleted();
        if (typeof userId !== 'string')
            throw OrganizationError.paramError('userId must be a string');
        if (!this._users[userId])
            throw OrganizationError.userDoesNotExistError(`user with id ${userId} does not exist in the organization`);
        delete this._users[userId];
    }

    get id() {
        return this.orgId;
    }

    get roles() {
        return Object.values(this._roles);
    }

    get users() {
        const userList = {};
        Object.keys(this._users).forEach(k => {
            userList[k] = Array.from(this._users[k].values());
        });
        return userList;
    }

    toJSON() {
        return {
            orgId: this.orgId,
            name: this.name,
            roles: this.roles,
            users: this.users,
        };
    }
}

module.exports = Organization;
