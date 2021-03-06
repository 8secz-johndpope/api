'use strict'

const _ = require('lodash')
const _h = require('../../_helpers')
const jwt = require('jsonwebtoken')
const querystring = require('querystring')

exports.handler = async (event, context) => {
  if (event.source === 'aws.events') { return _h.json({ message: 'OK' }) }

  try {
    const jwtSecret = await _h.ssmParameter('entu-api-jwt-secret')
    const clientId = await _h.ssmParameter('entu-api-google-id')

    const state = jwt.sign({ next: _.get(event, 'queryStringParameters.next') }, jwtSecret, {
      audience: _.get(event, 'requestContext.identity.sourceIp'),
      expiresIn: '5m'
    })

    const query = querystring.stringify({
      client_id: clientId,
      redirect_uri: `https://${event.headers.Host}${event.path}`,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      state: state
    })

    return _h.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${query}`, 302)
  } catch (e) {
    return _h.error(e)
  }
}
