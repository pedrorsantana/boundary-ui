import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import config from 'ember-get-config';
import RESTAdapter from '@ember-data/adapter/rest';
import { InvalidError } from '@ember-data/adapter/error';

module('Unit | Adapter | application', function (hooks) {
  setupTest(hooks);

  test('its namespace is equal to the configured namespace', function (assert) {
    assert.expect(2);
    const adapter = this.owner.lookup('adapter:application');
    assert.ok(adapter.namespace);
    assert.equal(adapter.namespace, config.api.namespace);
  });

  test('it generates correct URL prefixes', function (assert) {
    assert.expect(1);
    const adapter = this.owner.lookup('adapter:application');
    assert.equal(adapter.urlPrefix(), config.api.namespace);
  });

  test('it rewrites PUT to PATCH, but leaves others unchanged', function (assert) {
    assert.expect(1);
    const adapter = this.owner.lookup('adapter:application');
    // TODO this is icky, should be changed to a spy or stub
    RESTAdapter.prototype.ajax = (url, type) => {
      assert.equal(type, 'PATCH');
    };
    adapter.ajax('/', 'PUT');
  });

  test('it correctly identifies 400 responses as invalid', function (assert) {
    assert.expect(2);
    const adapter = this.owner.lookup('adapter:application');
    assert.ok(adapter.isInvalid(400));
    assert.notOk(adapter.isInvalid(401));
  });

  test('it returns an proper InvalidError from handleResponse', function (assert) {
    assert.expect(3);
    const adapter = this.owner.lookup('adapter:application');
    let payload = {
      status: 400,
      code: 'invalid_argument',
      message: 'The request was invalid.',
    };
    let handledResponse = adapter.handleResponse(400, {}, payload);
    assert.ok(handledResponse instanceof InvalidError);
    assert.equal(handledResponse.errors.length, 1);
    assert.equal(handledResponse.message, 'The request was invalid.');
  });

  test('it returns field-level errors in InvalidError from handleResponse', function (assert) {
    assert.expect(1);
    const adapter = this.owner.lookup('adapter:application');
    let payload = {
      status: 400,
      code: 'invalid_argument',
      message: 'The request was invalid.',
      details: {
        fields: [{ name: 'name', message: 'Name is wrong.' }],
      },
    };
    let handledResponse = adapter.handleResponse(400, {}, payload);
    assert.equal(
      handledResponse.errors.length,
      2,
      'A base error plus one field error'
    );
  });
});
