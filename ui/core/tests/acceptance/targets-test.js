import { module, test } from 'qunit';
import { visit, currentURL, click, find, fillIn } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import a11yAudit from 'ember-a11y-testing/test-support/audit';
import { Response } from 'miragejs';
import {
  authenticateSession,
//   // These are left here intentionally for future reference.
//   //currentSession,
//   //invalidateSession,
} from 'ember-simple-auth/test-support';

module('Acceptance | targets', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  const instances = {
    scopes: {
      global: null,
      org: null,
      project: null,
    },
    target: null,
    hostSets: null,
  };
  const urls = {
    orgScope: null,
    projects: null,
    project: null,
    targets: null,
    newTarget: null,
    target: null,
    targetHostSets: null,
    targetAddHostSets: null,
  };

  hooks.beforeEach(function () {
    // Setup Mirage mock resources for this test
    authenticateSession({});
    instances.scopes.global = this.server.create('scope', { id: 'global' });
    instances.scopes.org = this.server.create('scope', {
      type: 'org',
      scope: { id: 'global', type: 'global' },
    });
    instances.scopes.project = this.server.create('scope', {
      type: 'project',
      scope: { id: instances.scopes.org.id, type: 'org' },
    });
    instances.hostSets = this.server.createList('host-set', 4, {
      scope: instances.scopes.project,
    });
    instances.target = this.server.create('target', {
      scope: instances.scopes.project,
    });

    // Generate route URLs for resources
    urls.orgScope = `/scopes/${instances.scopes.org.id}`;
    urls.projects = `${urls.orgScope}/projects`;
    urls.project = `${urls.projects}/${instances.scopes.project.id}`;
    urls.targets = `${urls.project}/targets`;
    urls.newTarget = `${urls.targets}/new`;
    urls.target = `${urls.targets}/${instances.target.id}`;
    urls.targetHostSets = `${urls.target}/host-sets`;
    urls.targetAddHostSets = `${urls.target}/add-host-sets`;
  });

  hooks.afterEach(async function() {
    const notification = find('.rose-notification');
    if(notification) {
      await click('.rose-notification-dismiss');
    }
  });

  test('visiting targets', async function (assert) {
    assert.expect(1);
    await visit(urls.targets);
    await a11yAudit();
    assert.equal(currentURL(), urls.targets);
  });

  test('can navigate to a target form', async function (assert) {
    assert.expect(1);
    await visit(urls.targets);
    await click('main tbody .rose-table-header-cell:nth-child(1) a');
    await a11yAudit();
    assert.equal(currentURL(), urls.target);
  });

  test('can update a target and save changes', async function (assert) {
    assert.expect(2);
    await visit(urls.target);
    await fillIn('[name="name"]', 'update name');
    await fillIn('[name="default_port"]', '1234');
    await click('form [type="submit"]:not(:disabled)');
    assert.equal(this.server.db.targets[0].name, 'update name');
    assert.equal(this.server.db.targets[0].attributes.default_port, '1234');
  });

  test('can update a target and cancel changes', async function (assert) {
    assert.expect(2);
    await visit(urls.target);
    await fillIn('[name="name"]', 'update name');
    await fillIn('[name="default_port"]', '1234');
    await click('form button:not([type="submit"])');
    assert.notEqual(this.server.db.targets[0].name, 'update name');
    assert.notEqual(this.server.db.targets[0].port, '1234');
  });

  test('can create new target', async function (assert) {
    assert.expect(1);
    const targetsCount = this.server.db.targets.length;
    await visit(urls.newTarget);
    await fillIn('[name="name"]', 'Target name');
    await fillIn('[name="description"]', 'description');
    await fillIn('[name="default_port"]', '1234');
    await click('form [type="submit"]:not(:disabled)');
    assert.equal(this.server.db.targets.length, targetsCount + 1);
  });

  test('can cancel new target creation', async function (assert) {
    assert.expect(2);
    const targetsCount = this.server.db.targets.length;
    await visit(urls.newTarget);
    await fillIn('[name="name"]', 'Target Name');
    await click('form button:not([type="submit"])');
    assert.equal(this.server.db.targets.length, targetsCount);
    assert.equal(currentURL(), urls.targets);
  });

  test('can delete a target', async function(assert) {
    assert.expect(1);
    const targetsCount = this.server.db.targets.length;
    await visit(urls.target);
    await click('.rose-layout-page-actions .rose-dropdown-button-danger');
    assert.equal(this.server.db.targets.length, targetsCount - 1);
  });

  test('saving a new target with invalid fields displays error messages', async function (assert) {
    assert.expect(2);
    this.server.post('/targets', () => {
      return new Response(
        400,
        {},
        {
          status: 400,
          code: 'invalid_argument',
          message: 'The request was invalid.',
          details: {
            request_fields: [
              {
                name: 'name',
                description: 'Name is required.',
              },
            ],
          },
        }
      );
    });
    await visit(urls.newTarget);
    await fillIn('[name="name"]', 'new target');
    await click('form [type="submit"]');
    await a11yAudit();
    assert.ok(
      find('[role="alert"]').textContent.trim(),
      'The request was invalid.',
      'Displays primary error message.'
    );
    assert.ok(
      find('.rose-form-error-message').textContent.trim(),
      'Name is required.',
      'Displays field-level errors.'
    );
  });

  test('errors are displayed when save on target fails', async function (assert) {
    assert.expect(1);
    this.server.patch('/targets/:id', () => {
      return new Response(
        490,
        {},
        {
          status: 490,
          code: 'error',
          message: 'Oops.',
        }
      );
    });
    await visit(urls.target);
    await fillIn('[name="name"]', 'save target');
    await click('form [type="submit"]');
    await a11yAudit();
    assert.ok(
      find('[role="alert"]').textContent.trim(),
      'Oops.',
      'Displays primary error message.'
    );
  });

  test('errors are displayed when delete on a target fails', async function (assert) {
    assert.expect(1);
    this.server.del('/targets/:id', () => {
      return new Response(
        490,
        {},
        {
          status: 490,
          code: 'error',
          message: 'Oops.',
        }
      );
    });
    await visit(urls.target);
    await click('.rose-layout-page-actions .rose-dropdown-button-danger');
    await a11yAudit();
    assert.ok(
      find('[role="alert"]').textContent.trim(),
      'Oops.',
      'Displays primary error message.'
    );
  });

  test('saving an existing target with invalid fields displays error messages', async function (assert) {
    assert.expect(2);
    this.server.patch('/targets/:id', () => {
      return new Response(
        400,
        {},
        {
          status: 400,
          code: 'invalid_argument',
          message: 'The request was invalid.',
          details: {
            request_fields: [
              {
                name: 'name',
                description: 'Name is required.',
              },
            ],
          },
        }
      );
    });
    await visit(urls.target);
    await fillIn('[name="name"]', 'existing target');
    await click('form [type="submit"]');
    await a11yAudit();
    assert.ok(
      find('[role="alert"]').textContent.trim(),
      'The request was invalid.',
      'Displays primary error message.'
    );
    assert.ok(
      find('.rose-form-error-message').textContent.trim(),
      'Name is required.',
      'Displays field-level errors.'
    );
  });

  test('visiting target host sets', async function (assert) {
    assert.expect(1);
    await visit(urls.targetHostSets);
    await a11yAudit();
    assert.equal(currentURL(), urls.targetHostSets);
  });

  test('can delete a host sets', async function (assert) {
    assert.expect(0);
  });

  test('select and save host sets to add', async function (assert) {
    assert.expect(0);
    await visit(urls.targetAddHostSets);
  });

  test('select and cancel host sets to add', async function (assert) {
    assert.expect(0);
  });
});
