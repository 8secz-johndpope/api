const _     = require('underscore')
const async = require('async')
const fs    = require('fs')
const mongo = require('mongodb')
const mysql = require('mysql')
const op    = require('object-path')
const path  = require('path')



require.extensions['.sql'] = function(module, filename) { module.exports = fs.readFileSync(filename, 'utf8') }



const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1'
const MYSQL_PORT = process.env.MYSQL_PORT || 3306
const MYSQL_USER = process.env.MYSQL_USER
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD
const MONGODB = process.env.MONGODB || 'mongodb://localhost:27017/'



var log = function (s) {
    console.log((new Date()).toISOString().substr(11).replace('Z', ''), s)
}



var importProps = function(mysqlDb, callback) {
    log('start database ' +  mysqlDb + ' import')

    var mongoCon = NaN
    var sqlCon = mysql.createConnection({
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: mysqlDb,
        multipleStatements: true
    })

    async.series([
        function(callback) {
            mongo.MongoClient.connect(MONGODB, { ssl: true, sslValidate: false }, function (err, con) {
                if(err) { return callback(err) }

                mongoCon = con
                callback(null)
            })
        },

        function(callback) {
            mongoCon.listCollections({ name: 'entity' }).toArray(function(err, collections) {
                if(err) { return callback(err) }

                if (collections.length > 0) {
                    mongoCon.dropCollection('entity', callback)
                } else {
                    callback(null)
                }
            })
        },
        function(callback) {
            mongoCon.listCollections({ name: 'property' }).toArray(function(err, collections) {
                if(err) { return callback(err) }

                if (collections.length > 0) {
                    mongoCon.dropCollection('property', callback)
                } else {
                    callback(null)
                }
            })
        },

        // function(callback) {
        //     log('repair mongodb')
        //     mongoCon.command({ repairDatabase: 1 }, callback)
        // },

        function(callback) {
            log('create mongodb indexes')
            mongoCon.collection('property').createIndexes([
                { key: { entity: 1 } },
                { key: { type: 1 } },
                { key: { def: 1 } },
                { key: { value_integer: 1 } },
                { key: { created_by: 1 } },
                { key: { deleted_by: 1 } },
            ], callback)
        },

        function(callback) {
            log('create props table')
            sqlCon.query(require('./sql/create_props.sql'), callback)
        },

        function(callback) {
            log('insert entities to mongodb')
            sqlCon.query(require('./sql/entity.sql'), function(err, entities) {
                if(err) { return callback(err) }

                mongoCon.collection('entity').insertMany(entities, callback)
            })
        },
        function(callback) {
            log('insert props to mongodb')
            sqlCon.query(require('./sql/props.sql'), function(err, props) {
                if(err) { return callback(err) }

                mongoCon.collection('property').insertMany(props, callback)
            })
        },

        function(callback) {
            log('delete empty lang field')
            mongoCon.collection('property').updateMany({ lang: null }, { $unset: { lang: '' } }, callback)
        },
        function(callback) {
            log('delete empty value_text field')
            mongoCon.collection('property').updateMany({ value_text: null }, { $unset: { value_text: '' } }, callback)
        },
        function(callback) {
            log('delete empty value_integer field')
            mongoCon.collection('property').updateMany({ value_integer: null }, { $unset: { value_integer: '' } }, callback)
        },
        function(callback) {
            log('delete empty value_decimal field')
            mongoCon.collection('property').updateMany({ value_decimal: null }, { $unset: { value_decimal: '' } }, callback)
        },
        function(callback) {
            log('delete empty value_date field')
            mongoCon.collection('property').updateMany({ value_date: null }, { $unset: { value_date: '' } }, callback)
        },
        function(callback) {
            log('delete empty created_at field')
            mongoCon.collection('property').updateMany({ created_at: null }, { $unset: { created_at: '' } }, callback)
        },
        function(callback) {
            log('delete empty created_by field')
            mongoCon.collection('property').updateMany({ created_by: null }, { $unset: { created_by: '' } }, callback)
        },
        function(callback) {
            log('delete empty deleted_at field')
            mongoCon.collection('property').updateMany({ deleted_at: null }, { $unset: { deleted_at: '' } }, callback)
        },
        function(callback) {
            log('delete empty deleted_by field')
            mongoCon.collection('property').updateMany({ deleted_by: null }, { $unset: { deleted_by: '' } }, callback)
        },

        function(callback) {
            log('replace mysql numeric ids with mongodb ids')

            mongoCon.collection('entity').find({}).sort({ mid: 1 }).toArray(function (err, entities) {
                if(err) { return callback(err) }

                var l = entities.length
                async.eachSeries(entities, function(entity, callback) {
                    async.parallel([
                        function(callback) {
                            mongoCon.collection('property').updateMany({ entity: entity.mid }, { $set: { entity: entity._id } }, callback)
                        },
                        function(callback) {
                            mongoCon.collection('property').updateMany({ type: 'reference', value_integer: entity.mid }, { $set: { value_integer: entity._id } }, callback)
                        },
                        function(callback) {
                            mongoCon.collection('property').updateMany({ 'created_by': entity.mid }, { $set: { 'created_by': entity._id } }, callback)
                        },
                        function(callback) {
                            mongoCon.collection('property').updateMany({ 'deleted_by': entity.mid }, { $set: { 'deleted_by': entity._id } }, callback)
                        },
                    ], function(err) {
                        if(err) { return callback(err) }

                        l--
                        if (l % 1000 === 0) {
                            log(l + ' entities to go')
                        }
                        callback(null)
                    })
                }, callback)
            })
        },

        function(callback) {
            log('rename value_text to value')
            mongoCon.collection('property').updateMany({ value: { $exists: false }, value_text: { $ne: null } }, { $rename: { 'value_text': 'value' } }, callback)
        },
        function(callback) {
            log('rename value_integer to value')
            mongoCon.collection('property').updateMany({ value: { $exists: false }, value_integer: { $ne: null } }, { $rename: { 'value_integer': 'value' } }, callback)
        },
        function(callback) {
            log('rename value_decimal to value')
            mongoCon.collection('property').updateMany({ value: { $exists: false }, value_decimal: { $ne: null } }, { $rename: { 'value_decimal': 'value' } }, callback)
        },
        function(callback) {
            log('rename value_date to value')
            mongoCon.collection('property').updateMany({ value: { $exists: false }, value_date: { $ne: null } }, { $rename: { 'value_date': 'value' } }, callback)
        },

        function(callback) {
            log('rename created/deleted fields')
            mongoCon.collection('property').updateMany({}, { $rename: { 'created_at': 'created.at', 'created_by': 'created.by', 'deleted_at': 'deleted.at', 'deleted_by': 'deleted.by' } }, callback)
        },
    ], function(err) {
        if(err) { return callback(err) }

        log('end database ' +  mysqlDb + ' import')
        callback(null)
    })
}



var connection = mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD
})
connection.query(require('./sql/db.sql'), function(err, rows) {
    if(err) {
        console.error(err.toString())
        process.exit(1)
    }

    async.eachSeries(rows, function(row, callback) {
        importProps(row.db, callback)
    }, function(err) {
        if(err) {
            console.error(err.toString())
            process.exit(1)
        }

        process.exit(1)
    })
})
