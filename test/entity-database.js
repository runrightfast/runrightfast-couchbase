/**
 * Copyright [2013] [runrightfast.co]
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';
var expect = require('chai').expect;
var cbConnManager = require('..').couchbaseConnectionManager;
var EntityDatabase = require('..').EntityDatabase;
var Entity = require('runrightfast-commons').Entity;
var when = require('when');
var uuid = require('uuid');
var lodash = require('lodash');

describe('EntityDatabase', function() {
	var database = null;

	var idsToDelete = [];

	before(function(done) {

		var options = {
			couchbase : {
				"host" : [ "localhost:8091" ],
				buckets : [ {
					"bucket" : "default"
				} ]
			},
			logLevel : 'DEBUG',
			startCallback : function(result) {
				console.log('before::startCallback');
				console.log(result);

				database = new EntityDatabase({
					couchbaseConn : cbConnManager.getBucketConnection('default'),
					logLevel : 'DEBUG',
					entityConstructor : Entity
				});

				done();
			}
		};

		cbConnManager.registerConnection(options);

	});

	afterEach(function(done) {
		database.deleteEntities(idsToDelete).then(function(result) {
			idsToDelete = [];
			done();
		}, function(error) {
			console.error(JSON.stringify(error, undefined, 2));
			done(error.error);
		});

	});

	after(function(done) {
		database.deleteEntities(idsToDelete).then(function(result) {
			cbConnManager.stop(function() {
				cbConnManager.clear();
				idsToDelete = [];
				done();
			});
		}, function(error) {
			done(error);
		});

	});

	it('can create a new Entity in the database', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);
				done();
			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('#createEntity validates Entity arg', function(done) {
		database.createEntity().then(function(result) {
			done(new Error('expected validation error'));
		}, function(err) {
			console.log(err);
			done();
		});
	});

	it('create will fail if Entity fails validation', function(done) {
		database.createEntity({
			createdOn : 'asdasdasd'
		}).then(function(result) {
			done(new Error('expected create to fail because of validation error'));
		}, function(err) {
			console.log(err);
			done();
		});
	});

	it('create a new Entity in the database with the same id will fail', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);

				database.createEntity(entity).otherwise(function(error) {
					done();
				});

			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('can get an Entity from the database', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);

				when(database.getEntity(entity.id), function(result) {
					console.log('(getEntity() result : ' + JSON.stringify(result, undefined, 2));
					var retrievedEntity = result.value;
					var retrievedEntityCAS = result.cas;
					expect(retrievedEntity).to.exist;
					expect(retrievedEntityCAS).to.exist;
					expect(retrievedEntity.id).to.equal(result.value.id);
					done();
				}, function(err) {
					done(err);
				});

			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('getting an Entity from the database for an invalid id will return an error', function(done) {
		when(database.getEntity(uuid.v4()), function(result) {
			done(new Error('expected an error because the doc should not exist'));
		}, function(err) {
			expect(err.code).to.equal('NOT_FOUND');
			done();
		});
	});

	it('#getEntity validates its args', function(done) {
		when(database.getEntity(1), function(result) {
			done(new Error('expected validation error'));
		}, function(err) {
			console.log(err);
			done();
		});
	});

	it('#updateEntity validates its args', function(done) {
		when(database.updateEntity(null, null, 'azappala'), function(result) {
			done(new Error('expected validation error'));
		}, function(err) {
			console.log(err);
			done();
		});
	});

	it('#deleteEntity validates its args', function(done) {
		when(database.deleteEntity(), function(result) {
			done(new Error('expected validation error'));
		}, function(err) {
			console.log(err);
			done();
		});
	});

	it('can update an Entity from the database', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);

				when(database.getEntity(entity.id), function(result) {
					var retrievedEntity = result.value;
					var retrievedEntityCAS = result.cas;
					expect(retrievedEntity).to.exist;
					expect(retrievedEntityCAS).to.exist;
					expect(retrievedEntity.id).to.equal(result.value.id);

					result.value.description = 'test : can update an Entity from the database';
					when(database.updateEntity(result.value, result.cas, 'azappala'), function(result) {
						console.log('(getEntity() result after update:\n' + JSON.stringify(result, undefined, 2));
						var retrievedEntity2 = result.value;
						var retrievedEntityCAS2 = result.cas;

						try {
							expect(retrievedEntityCAS).to.not.equal(retrievedEntityCAS2);
							expect(retrievedEntity2.updatedOn.getTime() > retrievedEntity.updatedOn.getTime()).to.equal(true);
							expect(retrievedEntity2.updatedBy).to.equal('azappala');
							done();
						} catch (err) {
							done(err);
						}
					}, function(err) {
						done(err);
					});

				}, function(err) {
					done(err);
				});

			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('updating will fail for an invalid Entity', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);

				when(database.getEntity(entity.id), function(result) {
					var retrievedEntity = result.value;
					var retrievedEntityCAS = result.cas;
					expect(retrievedEntity).to.exist;
					expect(retrievedEntityCAS).to.exist;
					expect(retrievedEntity.id).to.equal(result.value.id);

					result.value.description = 'test : can update an Entity from the database';
					when(database.updateEntity({
						createdOn : 'INVALID DATE'
					}, result.cas, 'azappala'), function(result) {
						done(new Error('Expected update to fail'));
					}, function(err) {
						console.log(err);
						done();
					});

				}, function(err) {
					done(err);
				});

			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('updating an Entity from the database with an expired CAS should fail', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			try {
				expect(result.cas).to.exist;
				expect(result.value instanceof Entity).to.equal(true);

				when(database.getEntity(entity.id), function(result) {
					var retrievedEntity = result.value;
					var retrievedEntityCAS = result.cas;
					expect(retrievedEntity).to.exist;
					expect(retrievedEntityCAS).to.exist;
					expect(retrievedEntity.id).to.equal(result.value.id);

					result.value.description = 'test : can update an Entity from the database';
					return when(database.updateEntity(retrievedEntity, retrievedEntityCAS, 'azappala'), function(result) {
						console.log('(getEntity() result after update:\n' + JSON.stringify(result, undefined, 2));
						var retrievedEntity2 = result.value;
						var retrievedEntityCAS2 = result.cas;

						expect(retrievedEntityCAS).to.not.equal(retrievedEntityCAS2);
						expect(retrievedEntity2.updatedOn.getTime() >= retrievedEntity.updatedOn.getTime()).to.equal(true);
						expect(retrievedEntity2.updatedBy).to.equal('azappala');

						return result;
					}, function(err) {
						return err;
					}).then(function(result) {
						when(database.updateEntity(retrievedEntity, retrievedEntityCAS, 'azappala'), function(result) {
							done(new Error('Expected an error because the CAS should be expired'));
						}, function(error) {
							console.log(error);
							done();
						});

					}, function(error) {
						done(error);
					});

				}, function(err) {
					done(err);
				});

			} catch (err) {
				done(err);
			}

		}, function(err) {
			done(error);
		});
	});

	it('can delete an Entity from the database', function(done) {
		var entity = new Entity();
		idsToDelete.push(entity.id);
		database.createEntity(entity).then(function(result) {
			expect(result.cas).to.exist;
			expect(result.value instanceof Entity).to.equal(true);

			var removePromise_1 = when(database.deleteEntity(entity.id), function(result) {
				return result;
			}, function(err) {
				return err;
			});

			var removePromise_2 = when(removePromise_1, function(result) {
				console.log('delete result #1 : ' + JSON.stringify(result, undefined, 2));

				return when(database.deleteEntity(entity.id), function(result) {
					console.log('delete result2 : ' + JSON.stringify(result, undefined, 2));
					return result;
				}, function(error) {
					return error;
				});
			}, function(error) {
				return error;
			});

			when(removePromise_2, function(result) {
				done();
			}, function(error) {
				done(error);
			});

		}, function(err) {
			done(error);
		});
	});

	it('#deleteEntities validates the entity id array', function(done) {
		when(database.deleteEntities([ 1, 2 ]), function() {
			done(new Error('expected validation error'));
		}, function(error) {
			console.log(error);
			done();
		});
	});

	it('can retrieve multiple Entities from the database at once', function(done) {
		var entity1 = new Entity();
		idsToDelete.push(entity1.id);

		var entity2 = new Entity();
		idsToDelete.push(entity2.id);

		var creates = [];

		creates.push(when(database.createEntity(entity1), function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			return result;
		}, function(error) {
			return error;
		}));

		creates.push(when(database.createEntity(entity2), function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			return result;
		}, function(error) {
			return error;
		}));

		when(when.all(creates), function(results) {
			console.log(JSON.stringify(results, undefined, 2));

			try {
				var ids = lodash.map(results, function(result) {
					return result.valueid;
				});

				console.log(JSON.stringify(ids, undefined, 2));

				database.getEntities(ids).then(function(result) {
					console.log(JSON.stringify(result, undefined, 2));
					done();
				}, function(error) {
					done(error);
				});
			} catch (error) {
				done(error);
			}
		}, function(error) {
			done(error);
		});

	});

	it('can retrieve multiple Entities from the database at once - skipping invalid ids', function(done) {
		var entity1 = new Entity();
		idsToDelete.push(entity1.id);

		var entity2 = new Entity();
		idsToDelete.push(entity2.id);

		var creates = [];

		creates.push(when(database.createEntity(entity1), function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			return result;
		}, function(error) {
			return error;
		}));

		creates.push(when(database.createEntity(entity2), function(result) {
			console.log(JSON.stringify(result, undefined, 2));
			return result;
		}, function(error) {
			return error;
		}));

		when(when.all(creates), function(results) {
			console.log(JSON.stringify(results, undefined, 2));

			try {
				var ids = lodash.map(results, function(result) {
					return result.valueid;
				});

				ids.push(uuid.v4());
				console.log(JSON.stringify(ids, undefined, 2));

				database.getEntities(ids).then(function(result) {
					console.log(JSON.stringify(result, undefined, 2));
					done();
				}, function(error) {
					done(error);
				});
			} catch (error) {
				done(error);
			}
		}, function(error) {
			done(error);
		});

	});

	it('#getEntities validates that ids is an Array of Strings', function(done) {
		database.getEntities([ 1, 2 ]).then(function(result) {
			done(new Error('expected validation error'));
		}, function(error) {
			console.log(error);
			done();
		});

	});

	it('can check if the Design Documents have been defined', function(done) {
		when(database.checkDesignDocs(), function(results) {
			console.log(JSON.stringify(results, undefined, 2));
			done();
		}, function(error) {
			done(error);
		});
	});

	it('can check if the Design Documents have been defined and create them if they do not exist', function(done) {
		when(database.checkDesignDocs(true), function(results) {
			console.log(JSON.stringify(results, undefined, 2));
			done();
		}, function(error) {
			done(error);
		});
	});

	describe('has query functionality', function() {
		var idsToDelete = [];
		var entities = [];

		before(function(done) {
			this.timeout(1000 * 10);

			var now = Date.now();
			for ( var i = 0; i < 10; i++) {
				entities.push(new Entity());

				entities.push(new Entity({
					createdOn : new Date(now + (1000 * 60 * 60 * 24 * i)),
					updatedOn : new Date(now + (1000 * 60 * 60 * 24 * i))
				}));
			}

			lodash.forEach(entities, function(entity) {
				idsToDelete.push(entity.id);
			});

			var promises = lodash.map(entities, function(entity) {
				return when(database.createEntity(entity), function(result) {
					return result;
				}, function(error) {
					return error;
				});
			});

			// ensure design docs have been created
			promises.push(when(database.checkDesignDocs(true, true), function(results) {
				console.log(JSON.stringify(results, undefined, 2));
			}, function(error) {
				done(error);
			}));

			when(when.all(promises), function(results) {
				console.log('All entities have been created: ' + entities.length);
				/*
				 * By default, docs get persisted to disk every 5 seconds. Docs
				 * will not be available to query until they have been written
				 * to disk.
				 */
				setTimeout(done, 5300);
			});

		});

		after(function(done) {
			database.deleteEntities(idsToDelete).then(function(result) {
				idsToDelete = [];
				done();
			}, function(error) {
				console.error(JSON.stringify(error, undefined, 2));
				done(error.error);
			});
		});

		it('#checkDesignDocs validates create arg is a Boolean if specified', function(done) {
			database.checkDesignDocs('', true).then(function(result) {
				done(new Error('expected validation error'));
			}, function(err) {
				console.log(err);
				done();
			});
		});

		it('#checkDesignDocs validates replace arg is a Boolean if specified', function(done) {
			database.checkDesignDocs(true, '').then(function(result) {
				done(new Error('expected validation error'));
			}, function(err) {
				console.log(err);
				done();
			});
		});

		describe('#getEntitiesByCreatedOn', function() {

			it('validates that that date range values are Date objects', function(done) {
				var now = Date.now();
				var queryOptions = {
					from : {},
					to : ''
				};
				when(database.getEntitiesByCreatedOn(queryOptions), function(result) {
					done(new Error('Expected validation error'));
				}, function(error) {
					console.log(error);
					done();
				});
			});

			it('retrieves the first 20 records by default', function(done) {
				when(database.getEntitiesByCreatedOn(), function(result) {
					console.log('query results: ' + JSON.stringify(result, undefined, 2));
					try {
						expect(result.length).to.equal(20);
						done();
					} catch (err) {
						done(err);
					}

				}, function(error) {
					done(error);
				});
			});

			it('can return the Entity objects', function(done) {
				when(database.getEntitiesByCreatedOn({
					returnDocs : true
				}), function(result) {
					console.log('query results: ' + JSON.stringify(result, undefined, 2));
					try {
						try {
							expect(result.length).to.equal(20);
							result.forEach(function(record) {
								expect(record.value instanceof Entity).to.equal(true);
							});
							done();
						} catch (err) {
							done(err);
						}
					} catch (err) {
						done(err);
					}

				}, function(error) {
					done(error);
				});
			});

			it('can filter on a date range', function(done) {
				var now = Date.now();
				var queryOptions = {
					from : new Date(now + (1000 * 60 * 60 * 24)),
					to : new Date(now + (1000 * 60 * 60 * 24 * 5))
				};
				when(database.getEntitiesByCreatedOn(queryOptions), function(result) {
					console.log('result.length = ' + result.length);
					console.log('query results: ' + JSON.stringify(result, undefined, 2));
					try {
						expect(result.length).to.equal(4);
						done();
					} catch (err) {
						done(err);
					}

				}, function(error) {
					done(error);
				});
			});

		});

		describe('#getEntitiesByUpdatedOn', function() {
			it('can page through results using skip', function(done) {
				var now = Date.now();
				var queryOptions = {
					limit : 5,
					skip : 0
				};

				var docCount = 0;

				var nextPage = function(queryOptions) {
					return when(database.getEntitiesByUpdatedOn(queryOptions), function(result) {
						docCount += result.length;
						console.log('docCount = ' + docCount);
						console.log('result.length = ' + result.length);
						console.log('query results: ' + JSON.stringify(result, undefined, 2));
						return result;
					}, function(error) {
						done(error);
					});
				};

				var pages = [];
				for ( var i = 0; i < 5; i++) {
					queryOptions.skip += 5;
					pages.push(nextPage(queryOptions));
				}

				when(when.all(pages), function(result) {
					done();
				}, function(error) {
					done(error);
				});

			});

			it('can page through results using skip and startkey_docid', function(done) {
				var now = Date.now();
				var queryOptions = {
					limit : 5,
					skip : 0
				};

				var docCount = 0;

				var nextPage = function(queryOptions) {
					return when(database.getEntitiesByUpdatedOn(queryOptions), function(result) {
						docCount += result.length;
						console.log('docCount = ' + docCount);
						console.log('result.length = ' + result.length);
						console.log('query results: ' + JSON.stringify(result, undefined, 2));
						return result;
					}, function(error) {
						done(error);
					});
				};

				var firstPage = nextPage(queryOptions);

				when(firstPage, function(result) {
					queryOptions.startDocId = result[result.length - 1].id;
					return nextPage(queryOptions);
				}, function(err) {
					done(err);
				}).then(function(result) {
					done();
				}, function(err) {
					done(err);
				});

			});

		});

	});

});