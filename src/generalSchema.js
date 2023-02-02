export default (schema = {}) => ({
    summary: {
        title: 'Summary display',
        properties: {
            show: {
                type: 'boolean',
                default: false,
            },
            component: {
                type: 'string',
            },
            position: {
                type: 'string',
                enum: ['left', 'right', 'top', 'bottom'],
            },
            width: {
                type: 'string',
                default: '200px',
            },
            field: {
                type: 'string',
                description: 'Field to display',
            },
            min: {
                type: 'boolean',
                default: false,
            },
            max: {
                type: 'boolean',
                default: false,
            },
            avg: {
                type: 'boolean',
                default: false,
            },
            current: {
                type: 'boolean',
                default: false,
            },
        },
    },
    ...schema,
});
