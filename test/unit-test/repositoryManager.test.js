const assert = require('assert');
const orgEvents = require('../../lib/organization-events');
const repo = require('../../infrastructure/repository/repositoryManager')('testdb');
const Organization = require('../../domain/models/organization.class');
const Permission = require('../../domain/models/permission.class');
const Role = require('../../domain/models/role.class');

function toJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
}

describe('Repository Manager unit test', function () {
    let org;
    const perm = new Permission('auth-service', 'addRole');
    const role = new Role('waiter', [perm]);
    const userId = 'userId1';

    beforeEach(async () => {
        org = new Organization('Risto');
        await repo.db.reset();
    });

    it('check organizationCreated works', async function () {
        // Update
        await repo.organizationCreated(org);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.organizationCreated);
        assert.deepStrictEqual(lastEvent.payload, org.toJSON());
    });

    it('check roleAdded works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;

        // Update
        org.addRole(role);
        await repo.roleAdded(org, role);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.roleAdded);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, role }));
    });

    it('check roleRemoved works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;
        org.addRole(role);
        await repo.roleAdded(org, role);
        org._revisionId++;

        // Update
        org.removeRole(role.roleId);
        await repo.roleRemoved(org, role.roleId);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.roleRemoved);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, roleId: role.roleId }));
    });

    it('check userAdded works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;

        // Update
        org.addUser(userId);
        await repo.userAdded(org, userId);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.userAdded);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, userId }));
    });

    it('check rolesAssignedToUser works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;
        org.addRole(role);
        await repo.roleAdded(org, role);
        org._revisionId++;
        org.addUser(userId);
        await repo.userAdded(org, userId);
        org._revisionId++;
        const roles = [role.roleId]

        // Update
        org.assignRolesToUser(userId, roles);
        await repo.rolesAssignedToUser(org, userId, roles);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.rolesAssignedToUser);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, userId, roles }));
    });

    it('check rolesRemovedFromUser works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;
        org.addRole(role);
        await repo.roleAdded(org, role);
        org._revisionId++;
        org.addUser(userId);
        await repo.userAdded(org, userId);
        org._revisionId++;
        const roles = [role.roleId]
        org.assignRolesToUser(userId, roles);
        await repo.rolesAssignedToUser(org, userId, roles);
        org._revisionId++;

        // Update
        org.removeRolesFromUser(userId, roles);
        await repo.rolesRemovedFromUser(org, userId, roles);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.rolesRemovedFromUser);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, userId, roles }));
    });

    it('check userRemoved works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;
        org.addUser(userId);
        await repo.userAdded(org, userId);
        org._revisionId++;

        // Update
        org.removeUser(userId);
        await repo.userRemoved(org, userId);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.userRemoved);
        assert.deepStrictEqual(lastEvent.payload, toJSON({ orgId: org.orgId, userId }));
    });

    it('check organizationDeleted works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;

        // Update
        org.delete();
        await repo.organizationDeleted(org);

        // Assertions
        const events = await repo.db.getStream(org.orgId);
        const lastEvent = events[events.length-1];
        assert.strictEqual(lastEvent.message, orgEvents.organizationDeleted);
        assert.deepStrictEqual(lastEvent.payload, { orgId: org.orgId, status: org.status });
    });

    it('check getOrganization works', async function () {
        // Setup
        await repo.organizationCreated(org);
        org._revisionId = 1;
        org.addRole(role);
        await repo.roleAdded(org, role);
        org._revisionId++;
        org.addUser(userId);
        await repo.userAdded(org, userId);
        org._revisionId++;
        const roles = [role.roleId]
        org.assignRolesToUser(userId, roles);
        await repo.rolesAssignedToUser(org, userId, roles);
        org._revisionId++;
        org.removeRolesFromUser(userId, roles);
        await repo.rolesRemovedFromUser(org, userId, roles);
        org._revisionId++;
        org.removeUser(userId);
        await repo.userRemoved(org, userId);
        org._revisionId++;
        org.delete();
        await repo.organizationDeleted(org);
        org._revisionId++;
        
        const org2 = await repo.getOrganization(org.orgId);
        assert.deepStrictEqual(org2, org);
    });
});