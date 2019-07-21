const { cloneDeep, isArray, get, isFunction, flow: pipe } = require('lodash')
const {
  iFThenElse,
  deferAsync,
  isNotEmptyArray,
  mergeObjReducer,
  nullOrUndefined,
  fanOutMap,
  fanInMerge,
  each,
  getRelateProp,
  wrappedArray,
  objectBy
} = require('./fp')
const { extendArrayIteratorAsync, toAsyncIteratorIfArray } = require('./generator-helper')

const log = name => any => {
  console.log('-----------' + name + '--------')
  console.log(JSON.stringify(any))
  return any
}

const TYPES = {
  DATE: 'date',
  INT: 'int',
  FLOAT: 'float',
  TEXT: 'text',
  BOOL: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  FUNCTION: 'function',
  CUSTOM: 'custom'
}

/**
 *   Every node might has / has no paging which defaults to not paging
 */

const convertToType = ({ type }) => fieldData => {
  switch (type) {
    case TYPES.DATE: return fieldData ? new Date(fieldData) : undefined
    case TYPES.INT: return parseInt(fieldData)
    case TYPES.FLOAT: return parseFloat(fieldData)
    case TYPES.TEXT: return fieldData
    case TYPES.BOOL: return fieldData === 'true'
      ? true
      : fieldData === 'false'
        ? false
        : undefined
    case TYPES.OBJECT: return cloneDeep(fieldData) // if this is used when it it actually array--> beware of facebook's bug that gives us null object in their array
  }
  // logger.error(`the type specified is not matched ${type}, undefined is returned`)
  return undefined
}

const makeUrl = ({ node, accessToken, edge, query, version }) => `https://graph.facebook.com/${version}/${node}/${edge || ''}?access_token=${accessToken}&${query}`
const checkRequiredField = ({ name, require }) => val => {
  if (require === true && nullOrUndefined(val)) {
    throw new Error(`cannot find required field[${name}] from the body ${JSON.stringify(val)} `)
  }
  return val
}

const isPaging = ({ paging }) => nodeData => nodeData.paging && nodeData.paging.next && paging === true
// given log,request,version
module.exports = ({ request, logger }) => ({ format: rootFormat, query, version = 'v3.2' }) => {
  const makeRequestAsync = async path => {
    logger.debug(`paging found, path = ${path}`)
    let res
    try {
      res = await request(
        {
          method: 'GET',
          uri: path,
          simple: true,
          json: true
        }
      )
      logger.debug(`[${path}] request to fb graphql api result.`, res)
      return res
    } catch (err) {
      logger.error(`request to graphql api fail.`, err)
      throw err
    }
  }
  // [{type:'text',name:'message'}]
  // type:array ['1','2']
  // type:array + nested [{id,name},{id,name}]
  const eachFieldPipe = (field, parentNode) => {
    const { type, name, function: fn, nested } = field
    switch (type) {
      case TYPES.FUNCTION: return pipe(
        getRelateProp(name),
        any => fn(any, parentNode)
      )
      case TYPES.CUSTOM: return any => fn(any, parentNode)
      case TYPES.ARRAY: {
        if (nested) {
          const { fields } = nested
          return pipe(
            getRelateProp(name, []),
            each(
              fanOutMap(...fields.map(f =>
                pipe(
                  eachFieldPipe(f),
                  objectBy(f.name)
                )
              )),
              fanInMerge(mergeObjReducer)
            )
          )
        } else {
          return getRelateProp(name, []) // not specified nested
        }
      }
      default: return pipe(
        getRelateProp(name), // select only a prop,expect type custom need datum, type function
        convertToType(field),
        checkRequiredField(field) // may throw err
      )
    }
  }

  // extending array const..of with next page'result
  const fanInOverrideIterator = ([arr, getAsyncIterator]) => extendArrayIteratorAsync(arr)(async function* () {
    yield* await getAsyncIterator()
  })

  const pagingEnhancer = (format, executeNodes) => getDataPipe =>
    iFThenElse(
      isPaging(format)
    )(
      pipe(
        fanOutMap(
          getDataPipe, // pipe for get data array
          pipe( // pipe for enhancing
            getRelateProp('paging.next'), // --> url
            deferAsync(makeRequestAsync), // not trigger yet just defer it --> async fn
            nextAsync => async function* () {
              //console.log('getting next page') // due to async generator fn not start until next() is called ( by const..of)
              const response = await nextAsync()
              const extendArrayOrPlainArray = await executeNodes(format)(response) // may be other iterator or array if all page reached rate limit here
              yield* await extendArrayOrPlainArray
            }
          )
        ), // --> [array,getNextPageFnAsync]
        fanInOverrideIterator
      ),
      getDataPipe
    )

  const executeNodes = (format, parentNode) => {
    const { children, fields = [], any = true } = format // any is getting everything
    return pagingEnhancer(format, executeNodes)(
      pipe(
        wrappedArray('data'),
        each(
          fanOutMap(
            ...any ? [data => data] : [],
            ...fields.map(
              f => pipe(
                eachFieldPipe(f, parentNode),
                objectBy(f.name) // each field to object then merge later
              )
            ), // fields
            ...isNotEmptyArray(children)
              ? children.map(({ node: nodeName, ...format }) => {
                return input => ({
                  [nodeName]: pipe(
                    getRelateProp(`${nodeName}.data`, []), // select raw[node]
                    iFThenElse(isNotEmptyArray)(
                      executeNodes(format, input)
                    )
                  )(input)
                })
              }
              )
              : []
          ),
          fanInMerge(mergeObjReducer) // lose the rest props here, if any = false
          // @TODO : what if plain obj
        )
      )
    )
  }

  // if start on node_id ==> {} ==>
  // without node_id ==> { data : [],cursor,paging}
  return async ({ accessToken, node, edge }) => {
    const rootData = await makeRequestAsync(makeUrl({ node, accessToken, edge, query, version }))
    return executeNodes(rootFormat)(rootData)
  }
}
