'use strict'

const _ = require('lodash')
const _h = require('../../_helpers')
const https = require('https')
const jwt = require('jsonwebtoken')
const querystring = require('querystring')

exports.handler = async (event, context) => {
  if (event.source === 'aws.events') { return _h.json({ message: 'OK' }) }

  try {
    const jwtSecret = await _h.ssmParameter('entu-api-jwt-secret')
    const params = querystring.parse(event.body) || {}

    if (!params.state) { return _h.error([400, 'No state']) }

    const decodedState = jwt.verify(params.state, jwtSecret, { audience: _.get(event, 'requestContext.identity.sourceIp') })

    if (params.error) { return _h.error([400, params.error]) }

    if (!params.code) { return _h.error([400, 'No code']) }

    const accessToken = await getToken(params.code, `https://${event.headers.Host}${event.path}`)
    const profile = await getProfile(accessToken)
    const user = {
      ip: _.get(event, 'requestContext.identity.sourceIp'),
      provider: 'microsoft',
      id: _.get(profile, 'id'),
      name: _.get(profile, 'displayName'),
      email: _.get(profile, 'userPrincipalName')
    }

    const sessionId = await _h.addUserSession(user)

    if (decodedState.next) {
      return _h.redirect(`${decodedState.next}${sessionId}`, 302)
    } else {
      return _h.json({ key: sessionId })
    }
  } catch (e) {
    return _h.error(e)
  }
}

const getToken = async (code, redirect_uri) => {
  const clientId = await _h.ssmParameter('entu-api-microsoft-id')
  const clientSecret = await _h.ssmParameter('entu-api-microsoft-secret')

  return new Promise((resolve, reject) => {
    const query = querystring.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    })

    const options = {
      host: 'login.microsoftonline.com',
      port: 443,
      method: 'POST',
      path: '/common/oauth2/v2.0/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': query.length
      }
    }

    https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        data = JSON.parse(data)

        if (res.statusCode === 200 && data.access_token) {
          resolve(data.access_token)
        } else {
          reject(_.get(data, 'error_description', data))
        }
      })
    }).on('error', (err) => {
      reject(err)
    }).write(query)
  })
}

const getProfile = async (accessToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }

    https.get(`https://graph.microsoft.com/v1.0/me`, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        data = JSON.parse(data)

        if (res.statusCode === 200) {
          resolve(data)
        } else {
          reject(_.get(data, 'error_description', data))
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}
