## GET /auth/[facebook|google|live|twitter]
Start user authentication with given authenticator (facebook, google, live or twitter).

If parameter *next* is set, user is redirected to this url with added parameter *session*. Parameter *session* contains session ID. Use /auth/{session ID} to get JWT tokens for other requests.

If next is not set user is redirected to /auth/{session ID}

| parameter | | |
| -- | -- | -- |
| next | optional | Url where user is redirected after successful auth.




## GET /auth/{session ID}
Returns list of JWT tokens. Tokens are customer specific. Use this token in Bearer authorization header for all other requests.

**Example:**
```
curl \
    -X GET
    "https://api.entu.ee/auth/session/59abac1bb5684200016be4b8"
```




## GET /entity
Get list of entities. To filter entities by property value. Use dot separated list of property, data type and operator as parameter. Operator is optional, but must be *gt*, *gte*, *lt*, *lte*, *ne*, *regex* or *exists*.

| parameter | | |
| -- | -- | -- |
| props | optional | Comma separated list of properties to get. If not set all properties are returned. |
| sort | optional | Comma separated list of properties to use for sorting. Use - (minus) sign before property name for descending sort. If not set sorts by _id. |
| limit | optional | How many entities to return. |
| skip | optional | How many entities to skip in result. |

**Example:**
```
curl \
    -X GET \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQ1NiIsInR5iOjE11NiIsInR5" \
    https://api.entu.ee/entity?forename.string=John&file.size.gte=1024&surname.string.regex=/^Apple/i&photo._id.exists=false&sort=-file.size&limit=12
```

## GET /entity/{_id}
Get one entity with given id.

| parameter | | |
| -- | -- | -- |
| props | optional | Comma separated list of properties to get. If not set all properties are returned. |

**Example:**
```
curl \
    -X GET \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQ1NiIsInR5iOjE11NiIsInR5" \
    https://api.entu.ee/entity/59abac1bb5684200016be61e
```

## DELETE /entity/{_id}
Delete entity with given id.

**Example:**
```
curl \
    -X DELETE \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQ1NiIsInR5iOjE11NiIsInR5" \
    https://api.entu.ee/entity/59abac1bb5684200016be61e
```





## GET /property/{_id}
Get property with given id.

| parameter | | |
| -- | -- | -- |
| download | optional | If set and it's file property, redirects to file url. |

**Example:**
```
curl \
    -X GET \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQ1NiIsInR5iOjE11NiIsInR5" \
    https://api.entu.ee/property/59abac1bb5684200016be445?download
```

## DELETE /property/{_id}
Delete property with given id.

**Example:**
```
curl \
    -X DELETE \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQ1NiIsInR5iOjE11NiIsInR5" \
    https://api.entu.ee/entity/59abac1bb5684200016be445
```
