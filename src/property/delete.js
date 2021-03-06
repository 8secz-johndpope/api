'use strict'

const _ = require('lodash')
const _h = require('../_helpers')

exports.handler = async (event, context) => {
  if (event.source === 'aws.events') { return _h.json({ message: 'OK' }) }

  try {
    const user = await _h.user(event)
    if (!user.id) { return _h.error([403, 'No user']) }

    const pId = _h.strToId(event.pathParameters.id)
    const property = await user.db.collection('property').findOne({ _id: pId, deleted: { $exists: false } }, { projection: { _id: false, entity: true, type: true } })

    if (!property) { return _h.error([404, 'Property not found']) }
    if (property.type.startsWith('_')) { return _h.error([403, 'Can\'t delete system property']) }

    const entity = await user.db.collection('entity').findOne({ _id: property.entity }, { projection: { _id: false, 'private._owner': true, 'private._editor': true } })

    if (!entity) { return _h.error([404, 'Entity not found']) }

    const access = _.get(entity, 'private._owner', []).concat(_.get(entity, 'private._editor', [])).map((s) => s.reference.toString())

    if (!access.includes(user.id)) { return _h.error([403, 'User not in _owner nor _editor property']) }

    await user.db.collection('property').updateOne({ _id: pId }, { $set: { deleted: { at: new Date(), by: _h.strToId(user.id) } } })

    await _h.addEntityAggregateSqs(context, user.account, property.entity)

    return _h.json({ deleted: true })
  } catch (e) {
    return _h.error(e)
  }
}
