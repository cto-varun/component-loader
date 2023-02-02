export default {
    type: 'object',
    properties: {
        multiValueFilter: {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    default: false,
                },
                fieldsToFilter: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            datasource: {
                                type: 'string',
                                default: '',
                            },
                            fieldName: {
                                type: 'string',
                                default: '',
                            },
                            fieldAlias: {
                                type: 'string',
                                default: '',
                            },
                        },
                    },
                },
            },
        },
        rangeFilter: {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    default: false,
                },
                field: {
                    type: 'string',
                    default: 'date',
                },
                color: {
                    type: 'string',
                    default: 'green',
                },
                dateRanges: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            description: {
                                type: 'string',
                                default: '',
                            },
                            numberOfDays: {
                                type: 'integer',
                                default: -1,
                            },
                        },
                    },
                },
            },
        },
    },
};
