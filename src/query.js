import squel from 'squel';
import alasql from 'alasql';
import zipObject from 'lodash/zipObject';
import memoize from 'lodash/memoize';

import jsonata from 'jsonata';
import hash from 'object-hash';
import merge from 'lodash.merge';
import where from './where';

window[window.sessionStorage?.tabId].alasql = alasql;

const executeAta = memoize(
    function (query, data) {
        try {
            return jsonata(query).evaluate(data);
        } catch (e) {}
        return false;
    },
    (query, data) => {
        return query + hash(data, { algorithm: 'md5' });
    }
);

alasql.fn.jsonata = executeAta;

export const getTableName = (id) => `datasource_${id}`.replace(/-/gi, '_');

/**
 * Insert data into Alasql instance
 * @param {object} datasource
 * @param {object} raw_data
 */
export const insertData = (datasource, data, additionalProps = {}) => {
    const { id, fields } = datasource;
    if (Array.isArray(data)) {
        // Add data but overwrite at the moment
        addData(id, fields, data, true, additionalProps);
    } else {
        const converData = [];
        converData.push(data);
        // Add data but overwrite at the moment
        // Pushing object in the Array
        addData(id, fields, converData, true, additionalProps);
    }
};

export const createTable = (id, fields) => {
    const tableName = getTableName(id);

    if (!alasql.tables[tableName]) {
        const query = squel.create().table(tableName);

        /* Add fiels to query */
        fields.forEach(({ name, type }) => query.field(name, type));

        /* Create table */
        alasql(query.toString());
    }
};

export const dropTable = (id) => {
    const tableName = getTableName(id);

    if (alasql.tables[tableName]) {
        delete alasql.tables[tableName];
    }
};

export const dropOrCreateTable = (id, fields) => {
    const tableName = getTableName(id);

    if (alasql.tables[tableName]) {
        delete alasql.tables[tableName];
    }

    createTable(id, fields);
};

export const flatObject = (ob) => {
    const toReturn = {};

    for (const i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        if (typeof ob[i] === 'object' && ob[i] !== null) {
            const flatedObject = flatObject(ob[i]);
            for (const x in flatedObject) {
                if (!flatedObject.hasOwnProperty(x)) continue;

                toReturn[`${i}.${x}`] = flatedObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};

export const getMultiValueFilterOptions = ({
    multiValueFilter = {},
    queries = [],
    defaultData = {},
}) => {
    if (
        !multiValueFilter.enabled ||
        !multiValueFilter.fieldsToFilter ||
        multiValueFilter.fieldsToFilter.length === 0
    )
        return false;

    const validFilters = multiValueFilter.fieldsToFilter
        .map(({ datasource, fieldName }) => {
            if (!datasource) return false;

            const query = queries.find(
                ({ tableName }) =>
                    tableName &&
                    fieldName &&
                    tableName.toLowerCase() === datasource.toLowerCase()
            );
            if (!query) return false;

            const field =
                query.fields.find(({ alias }) => alias === fieldName) || {};

            return {
                datasource,
                fieldName: field.field || fieldName,
                alias: field.alias,
            };
        })
        .filter(Boolean);
    const data = defaultData.reduce(
        (acc, d) => ({ data: acc.data.concat(d.execute()) }),
        // Reduce default values:
        { data: [] }
    );

    if (!data.data) return false;
    const flatData = flatObject(data.data);
    const valuesList = [];
    const generateOption = (key) => {
        const value = flatData[key];
        if (value === undefined) return false;

        const optionFieldName = key.split('.').pop();
        const field = validFilters.find(({ fieldName, alias }) =>
            alias ? optionFieldName === alias : optionFieldName === fieldName
        );
        if (!field) return false;

        if (valuesList.indexOf(value) > -1) return false;
        valuesList.push(value);
        return {
            alias: field.alias || field.fieldName,
            field: field.fieldName,
            key: optionFieldName,
            value,
        };
    };

    return Object.keys(flatData).map(generateOption).filter(Boolean);
};

export const addData = (
    id,
    fields,
    data,
    overwrite = false,
    additionalProps
) => {
    const { extractFields, extractData } = additionalProps || {};
    const tableName = getTableName(id);

    /* Create a table per datasource if doesn't exists */
    createTable(id, fields);

    if (data) {
        let dataToWrite = data;
        let fieldsToZIP = fields.map((field) => field.name);

        if (extractData && extractData !== '') {
            dataToWrite = executeAta(extractData, data);
        }

        const isZipped =
            Array.isArray(dataToWrite) && Array.isArray(dataToWrite[0]);
        if (extractFields && extractFields !== '') {
            fieldsToZIP = executeAta(extractFields, data);
        }

        // Data seems to be compressed, needs to map fields names to data
        // { fields: [a,b], data: [1,2], [3,4] } => transforms to => [ { a:1,  b:2 }, { a: 3, b: 4} ]
        if (isZipped && fieldsToZIP && dataToWrite.length) {
            dataToWrite = dataToWrite.map((item) =>
                zipObject(fieldsToZIP, item)
            );
        }

        writeData(tableName, dataToWrite, overwrite);
    }
};

/*
 * Zip object (convert from [...values] to [ { field:value } ])
 * and after inject the object into database
 */
const writeData = (tableName, data, overwrite) => {
    if (overwrite) {
        alasql.tables[tableName].data = data;
    } else {
        alasql.tables[tableName].data = alasql.tables[tableName].data.concat(
            data
        );
    }
};

/**
 * Insert test data from fake database to alasql
 * Format slightly changed with raw_data embedded
 * into data source definition
 *
 * @param {Array} datasources
 */
export const insertTestData = (datasources = []) =>
    datasources.map((datasource) =>
        insertData(datasource, datasource.raw_data, { extractFields: null })
    );

/**
 * Obtain a sample query
 */
export const getSampleQueries = () => [
    {
        table: '37ce97a1-c902-49d6-a4c1-6e48bc25a693',
        fields: [
            {
                field: 'revenue',
                alias: null,
                fn: 'all',
                raw: 'revenue',
            },
            {
                field: 'type',
                alias: null,
                fn: 'all',
                raw: 'type',
            },
        ],
        conditions: null,
        groupBy: null,
    },
];

/**
 * Helper for data extraction from table
 *
 * @param {String} querySettings.table
 * @param {Array} querySettings.fields Fields to select, if empty all fields will be selected
 * @param {Array} querySettings.conditions Where clause conditions
 * @param {Array} querySettings.groupBy Group fields
 * @return {Object} Meta information about query
 */
export const tableMeta = (querySettings) => {
    const { groupBy = [], table } = querySettings;

    // Get types
    const tableColumns = alasql(`SHOW COLUMNS FROM ${getTableName(table)}`);
    const result = tableColumns.reduce(
        (acc, curr) => {
            acc.allFields.push(curr.columnid);

            switch (curr.dbtypeid) {
                case 'DATE':
                    acc.timeField = curr.columnid;
                    break;
                case 'STRING':
                    acc.labelFields = acc.labelFields.concat(
                        groupBy,
                        curr.columnid
                    );
                    break;
                default:
            }

            return acc;
        },
        {
            timeField: null,
            allFields: [],
            labelFields: [],
        }
    );

    return result;
};

/**
 * Get universal format for data output
 * which can be parsed by any component
 *
 * @param {String} querySettings.table
 * @param {Array} querySettings.fields Fields to select, if empty all fields will be selected
 * @param {Array} querySettings.conditions Where clause conditions
 * @param {Array} querySettings.groupBy Group fields
 * @return {Object} Unversal datasource description
 */
export const queryDatasource = (querySettings) => {
    const { table, fields } = querySettings;
    const dataTypesFromDB = alasql(
        `SHOW COLUMNS FROM ${getTableName(table)}`
    ).reduce(
        (acc, { columnid, dbtypeid }) => ({ ...acc, [columnid]: dbtypeid }),
        {}
    );

    if (Array.isArray(fields) && Object.keys(dataTypesFromDB).length) {
        return (
            fields
                .filter((f) => !!f)
                /* Extract value from SQL query like `field AS fieldName` */
                .map(({ field, alias, fn, raw }) =>
                    fn === 'all'
                        ? sourceField(
                              field,
                              (
                                  dataTypesFromDB[field] || 'string'
                              ).toLowerCase(),
                              alias
                          )
                        : computedField(raw)
                )
        );
    }

    return [];
};

/**
 * Get a dataset based
 * @param {*} initialQuery
 */
export const summary = (qs) => ({
    avg = false,
    max = false,
    min = false,
    sum = false,
    current = false,
    groups = [],
    field = '',
} = {}) => {
    const internalQS = qs.clone();

    if (!field || field === '') {
        return [];
    }

    [].concat(groups).forEach((group) => {
        if (group && group !== '') {
            internalQS.field(`LAST(${group}) as ${group}`);
            internalQS.group(group);
        }
    });

    avg && internalQS.field(`AVG(${field}) as Average`);
    max && internalQS.field(`MAX(${field}) as Maximum`);
    min && internalQS.field(`MIN(${field}) as Minumum`);
    sum && internalQS.field(`SUM(${field}) as Total`);
    current && internalQS.field(`LAST(${field}) as Current`);

    try {
        return alasql(internalQS.toString());
    } catch (e) {
        return [];
    }
};

/**
 * Query runner factory.
 *
 * @param {String} querySettings.table
 * @param {Array} querySettings.fields Fields to select, if empty all fields will be selected
 * @param {Array} querySettings.conditions Where clause conditions
 * @param {Array} querySettings.groupBy Group fields
 */
export const queryFactory = (querySettings) => {
    const {
        table,
        conditions,
        groupBy,
        order,
        key,
        isArray = false,
    } = querySettings;
    const query = querySettings.queryString.replace(table, getTableName(table));
    const isGrouped = Array.isArray(groupBy) && groupBy.length > 0;
    let queryString = {};
    let queryStringWithFields = {};

    /** No table - empty result */

    if (!table) {
        return {};
    }

    if (
        isGrouped ||
        (conditions.rules !== undefined && conditions.rules.length > 0)
    ) {
        queryString = squel.select().from(getTableName(table));
        /** Apply conditions */
        if (conditions) {
            const { sql } = where(false, false, conditions);
            queryString.where(sql);
        }

        queryStringWithFields = queryString.clone();

        /** Add grouping */
        if (isGrouped) {
            groupBy.map((field) => queryStringWithFields.group(field));
        }

        /** Add Ordering */
        if (order) {
            queryStringWithFields.order(order.field, order.ascending);
        }
    }

    //

    /** Add functions to the call */
    // if (Array.isArray(fields)) {
    //     const activeFields = fields.filter(f => !!f);
    //     activeFields.map(({ alias, raw, fn }) =>
    //         queryStringWithFields.field(
    //             fn === 'all' && isGrouped
    //                 ? `FIRST(${raw}) as ${raw}`
    //                 : `${raw} as ${raw}`
    //         )
    //     );
    // }

    /** Force add time field to a query */
    const meta = tableMeta(querySettings);

    try {
        return {
            tableMeta: meta,
            alasql,
            queryString,
            queryStringWithFields,
            datasource: queryDatasource(querySettings),
            query,
            key,
            isArray,
            summary: summary(queryString),
            execute: () => {
                try {
                    function tryAlasql(query) {
                        try {
                            // TBD - add data mapping here for jsonata queries since they return a nested array/object
                            return alasql(query);
                        } catch (e) {
                            /* global.console.log('alasql error', e) */
                            return [];
                        }
                    }
                    return _.isEmpty(queryStringWithFields)
                        ? tryAlasql(query)
                        : tryAlasql(queryStringWithFields.toString());
                } catch (e) {
                    return [];
                }
            },
        };
    } catch (e) {
        throw new Error('Failed to execute query', e);
    }
};

class CreateTableBlock extends squel.cls.Block {
    /** The method exposed by the query builder */
    table(name) {
        this._name = name;
    }

    /** The method which generates the output */
    _toParamString(options) {
        return {
            text: this._name,
            values: [] /* values for paramterized queries */,
        };
    }
}

class CreateFieldBlock extends squel.cls.Block {
    constructor(options) {
        super(options);
        this._fields = [];
    }

    /** The method exposed by the query builder */
    field(name, type) {
        this._fields.push({
            name,
            type,
        });
    }

    /** The method which generates the output */
    _toParamString(options) {
        const str = this._fields
            .map((f) => {
                return `${f.name} ${f.type.toUpperCase()}`;
            })
            .join(', ');

        return {
            text: `(${str})`,
            values: [] /* values for paramterized queries */,
        };
    }
}

class CreateTableQuery extends squel.cls.QueryBuilder {
    constructor(options, blocks) {
        super(
            options,
            blocks || [
                new squel.cls.StringBlock(options, 'CREATE TABLE'),
                new CreateTableBlock(options),

                new CreateFieldBlock(options),
            ]
        );
    }
}

/** Convenience method */
squel.create = function (options) {
    return new CreateTableQuery(options);
};

class GeneralTypeContainer {
    constructor(args) {
        Object.assign(this, args);
    }

    toJSON() {
        return this;
    }

    toString() {
        return JSON.stringify(this);
    }
}

export class ComputedField extends GeneralTypeContainer {}
export class SourceField extends GeneralTypeContainer {}

export const sourceField = (name, type = 'string', alias = name) =>
    new SourceField({ name, type, alias });
export const computedField = (raw, fn = null, alias = null) =>
    new ComputedField({
        field: '',
        alias,
        fn,
        raw,
    });

export default squel;
