const logger = require('@greenrenge/logger')('fb-graphql.unwrapper')
const { convertToType } = require('./type-converter')
const cloneDeep = require('lodash/cloneDeep')
const defaultRequest = require('request-promise')
const isArray = require('lodash/isArray')

function fieldExtraction (data, fieldsFormat) {
  const output = {}
  // assign the field
  for (const field of fieldsFormat) {
    const extractedData = data[field.name]
    if (field.require && (extractedData === null || extractedData === undefined)) {
      logger.error(`cannot find required field[${field.name}] from the data body`, data)
      throw new Error(`cannot find required field[${field.name}] from the body ${JSON.stringify(data)} `)
    }
    if (field.type === 'array') {
      output[field.name] = []
      const nestedData = (extractedData || []).filter(i => !((i === null || i === undefined))) // facebook sometimes give null to their data array
      for (const eachObj of nestedData) {
        const convertedNested = fieldExtraction(eachObj, field.nested.fields)
        output[field.name].push(convertedNested)
      }
    } else {
      if (field.type === 'function') {
        output[field.name] = field.function(cloneDeep(extractedData))
      } else if (field.type === 'custom') {
        output[field.name] = field.function(cloneDeep(data))
      } else {
        output[field.name] = convertToType(field.type, extractedData)
      }
    }
  }
  return output
}

/**
 *
 * @param {*} body
 * @param {*} format
 * @param {*} assignTask
 * @param {*} nextPageTask
 * assignTask and nextPageTask is init at firstLevel(Root) only
 * it will find all the paging needed and put it in the tasks
 * at root level it will convert all task to the real val
 */
async function unwrapBody ({ body, format, pagingCondition }, request/* child */, assignTask/** child */, allPagesCollector, { onEach, onEachPromisesCollector, eachAsync }) {
  const isRoot = !assignTask
  if (isRoot) assignTask = [] // find the root level of calling that need to await all the task before return

  const isFirstPage = !allPagesCollector
  if (isFirstPage) allPagesCollector = [] // find the firstPage of any level

  let unwrapped = []
  // there are 3 cases
  // 1.have data and paging    2.have data but not paging    3.no data no paging
  if (body.data && isArray(body.data) && body.data.length === 0) return []

  // if there is no data, put it as array
  const rawDataArr = (isArray(body.data)) ? body.data : [body] // facebook graph data [] array

  const paging = body.paging // facebook graph paging object, only have if there is data array?

  // tasks.push({
  //   obj: objOut,
  //   prop: child.node,
  //   task
  // })
  // tasks is for later assigning a property to the object by convert the task

  for (let i = 0, len = rawDataArr.length; i < len; i++) {
    // thru rawData
    const rawData = rawDataArr[i]
    const objOut = fieldExtraction(rawData, format.fields) // look into format.fields and try to extract them from raw data

    // its children nodes
    if (format.children && format.children.length) {
      for (const child of format.children) {
        // we dont know yet that there is another async call within child node here (paging), then we called it a asyncTask
        const task = unwrapBody({
          body: rawData[child.node] || { data: [] }, // default if undefined
          format: child
        }, request, assignTask)

        // push the task to be await in the root level to assign to property
        assignTask.push({
          obj: objOut,
          prop: child.node,
          task
        })
      }
    }
    if (onEach && onEachPromisesCollector && eachAsync) {
      onEachPromisesCollector.push(onEach(objOut))
    } else if (onEach && onEachPromisesCollector) {
      try {
        onEachPromisesCollector.push(await onEach(objOut))
      } catch (err) {
        logger.error('onEach error during call synchronously', err)
      }
    }
    unwrapped.push(objOut)
  }

  if (!isArray(body.data) && unwrapped.length <= 1) {
    // object not array
    if (isRoot) {
      for (const assign of assignTask) {
        const obj = assign.obj
        const prop = assign.prop
        const task = assign.task
        obj[prop] = await task
      }
    }
    return unwrapped.length ? unwrapped[0] : {}
  }

  // if arrays data from facebook
  // if any paging
  // if format.paging == undefined --> get all page
  if (paging && paging.next && format.paging !== false && (!pagingCondition || pagingCondition(unwrapped, onEachPromisesCollector))) {
    const fullPath = paging.next
    logger.debug(`paging found, path = ${fullPath}`)
    let res
    try {
      res = await request(
        {
          method: 'GET',
          uri: fullPath,
          simple: true,
          json: true
        }
      )
      logger.debug(`[${fullPath}] request to fb graphql api result.`, res)
    } catch (err) {
      logger.error(`request to graphql api fail.`, err)
      throw new Error(
        `request to graphql fail ${fullPath}` // @TODO : if rate limit code 32 here, should not throw
      )
    }
    if (res) {
      // send allPagesCollector to collect all pages data
      await unwrapBody({ body: res, format, pagingCondition }, request, assignTask, allPagesCollector, { onEach, onEachPromisesCollector, eachAsync })// specified nextPageTask to specify it is not the first page
    }
  }

  if (!isFirstPage) {
    // after 2nd page
    allPagesCollector.push(unwrapped)
  } else {
    // first page
    unwrapped = unwrapped.concat(...allPagesCollector.reverse())// reverse to keep sort from original search
  }

  // await all assignTask
  if (isRoot) {
    for (const assign of assignTask) {
      const obj = assign.obj
      const prop = assign.prop
      const task = assign.task
      obj[prop] = await task
    }
  }

  return unwrapped
}

module.exports = class FacebookGraphQL {
  constructor ({ query, accessToken, version = 'v3.0', node, format }) {
    this.query = query
    this.accessToken = accessToken
    this.version = version
    this.node = node
    this.format = format
  }
  static buildURI ({ query, accessToken, version, node }) {
    const URI = `https://graph.facebook.com/${version}/${node}/?access_token=${accessToken}&${query}`
    logger.debug(`[FacebookGraphQL]built uri is ${URI}`)
    return URI
  }
  async execute ({ request = defaultRequest, eachAsync = true, onEach, pagingCondition }) {
    const fullPath = FacebookGraphQL.buildURI({
      query: this.query,
      accessToken: this.accessToken,
      version: this.version,
      node: this.node
    })

    logger.debug(`[FacebookGraphQL]start request to graphql, path = ${fullPath}`)
    let res
    try {
      res = await request(
        {
          method: 'GET',
          uri: fullPath,
          simple: true,
          json: true
        }
      )
    } catch (err) {
      logger.error(`[FacebookGraphQL] request to facebook api fail`, err)
      throw new Error(
        `facebook api error :${err.message} , path is ${fullPath}, response is ${res}`
      )
    }
    try {
      logger.debug(`[FacebookGraphQL][${fullPath}] request to fb graphql api result.`, res)
      // to collect the pending promises
      const onEachPromisesCollector = []
      const result = await unwrapBody({ body: res, format: this.format, pagingCondition }, request, null, null, { onEach, onEachPromisesCollector, eachAsync })
      return {
        result,
        onEachPromises: onEachPromisesCollector // to control flow program
      }
    } catch (err) {
      logger.error(`[FacebookGraphQL] execute graphql api fail.`, err)
      throw new Error(
        `The transform data fail for request , detail : ${err.message}, path is ${fullPath}, response is ${JSON.stringify(res)}`// res is latest success called, if error is #32 page rate limit reached
      )
    }
  }
}
