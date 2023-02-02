const sqlOperators = {
    equal: { op: '= ?' },
    not_equal: { op: '!= ?' },
    in: { op: 'IN(?)', sep: ', ' },
    not_in: { op: 'NOT IN(?)', sep: ', ' },
    less: { op: '< ?' },
    less_or_equal: { op: '<= ?' },
    greater: { op: '> ?' },
    greater_or_equal: { op: '>= ?' },
    between: { op: 'BETWEEN ?', sep: ' AND ' },
    not_between: { op: 'NOT BETWEEN ?', sep: ' AND ' },
    begins_with: { op: 'LIKE(?)', mod: '{0}%' },
    not_begins_with: { op: 'NOT LIKE(?)', mod: '{0}%' },
    contains: { op: 'LIKE(?)', mod: '%{0}%' },
    not_contains: { op: 'NOT LIKE(?)', mod: '%{0}%' },
    ends_with: { op: 'LIKE(?)', mod: '%{0}' },
    not_ends_with: { op: 'NOT LIKE(?)', mod: '%{0}' },
    is_empty: { op: "= ''" },
    is_not_empty: { op: "!= ''" },
    is_null: { op: 'IS NULL' },
    is_not_null: { op: 'IS NOT NULL' },
};

/**
 * Default operators
 * @type {object.<string, object>}
 * @readonly
 */
const OPERATORS = {
    equal: {
        type: 'equal',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string', 'number', 'datetime', 'boolean'],
    },
    not_equal: {
        type: 'not_equal',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string', 'number', 'datetime', 'boolean'],
    },
    in: {
        type: 'in',
        nb_inputs: 1,
        multiple: true,
        apply_to: ['string', 'number', 'datetime'],
    },
    not_in: {
        type: 'not_in',
        nb_inputs: 1,
        multiple: true,
        apply_to: ['string', 'number', 'datetime'],
    },
    less: {
        type: 'less',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    less_or_equal: {
        type: 'less_or_equal',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    greater: {
        type: 'greater',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    greater_or_equal: {
        type: 'greater_or_equal',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    between: {
        type: 'between',
        nb_inputs: 2,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    not_between: {
        type: 'not_between',
        nb_inputs: 2,
        multiple: false,
        apply_to: ['number', 'datetime'],
    },
    begins_with: {
        type: 'begins_with',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    not_begins_with: {
        type: 'not_begins_with',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    contains: {
        type: 'contains',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    not_contains: {
        type: 'not_contains',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    ends_with: {
        type: 'ends_with',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    not_ends_with: {
        type: 'not_ends_with',
        nb_inputs: 1,
        multiple: false,
        apply_to: ['string'],
    },
    is_empty: {
        type: 'is_empty',
        nb_inputs: 0,
        multiple: false,
        apply_to: ['string'],
    },
    is_not_empty: {
        type: 'is_not_empty',
        nb_inputs: 0,
        multiple: false,
        apply_to: ['string'],
    },
    is_null: {
        type: 'is_null',
        nb_inputs: 0,
        multiple: false,
        apply_to: ['string', 'number', 'datetime', 'boolean'],
    },
    is_not_null: {
        type: 'is_not_null',
        nb_inputs: 0,
        multiple: false,
        apply_to: ['string', 'number', 'datetime', 'boolean'],
    },
};

const changeType = function (value, type, boolAsInt) {
    switch (type) {
        case 'integer':
            return parseInt(value, 10);
        case 'double':
            return parseFloat(value);
        case 'boolean':
            var bool =
                value.trim().toLowerCase() === 'true' ||
                value.trim() === '1' ||
                value === 1;
            return boolAsInt ? (bool ? 1 : 0) : bool;
        default:
            return value;
    }
};

const escapeString = function (value) {
    if (typeof value !== 'string') {
        return value;
    }

    return (
        value
            .replace(/[\0\n\r\b\\'"]/g, function (s) {
                switch (s) {
                    // @formatter:off
                    case '\0':
                        return '\\0';
                    case '\n':
                        return '\\n';
                    case '\r':
                        return '\\r';
                    case '\b':
                        return '\\b';
                    default:
                        return `\\${  s}`;
                    // @formatter:off
                }
            })
            // uglify compliant
            .replace(/\t/g, '\\t')
            .replace(/\x1a/g, '\\Z')
    );
};

const fmt = function (str, args) {
    if (!Array.isArray(args)) {
        args = Array.prototype.slice.call(arguments, 1);
    }

    return str.replace(/{([0-9]+)}/g, function (m, i) {
        return args[parseInt(i, 10)];
    });
};

/**
 * Statements for internal -> SQL conversion
 */
const sqlStatements = {
    question_mark () {
        const params = [];
        return {
            add (rule, value) {
                params.push(value);
                return '?';
            },
            run () {
                return params;
            },
        };
    },

    numbered (char) {
        if (!char || char.length > 1) char = '$';
        let index = 0;
        const params = [];
        return {
            add (rule, value) {
                params.push(value);
                index++;
                return char + index;
            },
            run () {
                return params;
            },
        };
    },

    named (char) {
        if (!char || char.length > 1) char = ':';
        const indexes = {};
        const params = {};
        return {
            add (rule, value) {
                if (!indexes[rule.field]) indexes[rule.field] = 1;
                const key = `${rule.field  }_${  indexes[rule.field]++}`;
                params[key] = value;
                return char + key;
            },
            run () {
                return params;
            },
        };
    },
};

/**
 * Returns rules as a SQL query
 * @param {boolean|string} [stmt] - use prepared statements: false, 'question_mark', 'numbered', 'numbered(@)', 'named', 'named(@)'
 * @param {boolean} [nl=false] output with new lines
 * @param {object} [data] - current rules by default
 */
const getSQL = (stmt, nl, data) => {
    nl = nl ? '\n' : ' ';
    const boolean_as_integer = true;

    if (stmt === true) stmt = 'question_mark';
    if (typeof stmt === 'string') {
        const config = getStmtConfig(stmt);
        stmt = sqlStatements[config[1]](config[2]);
    }

    const self = this;

    const sql = (function parse(group) {
        if (!group.combinator) {
            group.combinator = self.settings.default_combinator;
        }
        if (['AND', 'OR'].indexOf(group.combinator.toUpperCase()) === -1) {
            throw new Error(
                `Unable to build SQL query with combinator "${group.combinator}"`
            );
        }

        if (!group.rules) {
            return '';
        }

        const parts = [];

        group.rules.forEach(function (rule) {
            if (rule.rules && rule.rules.length > 0) {
                parts.push(`(${  nl  }${parse(rule)  }${nl  })${  nl}`);
            } else {
                const sql = sqlOperators[rule.operator];
                const ope = OPERATORS[rule.operator];
                let value = '';

                if (sql === undefined) {
                    return;
                }

                if (ope.nb_inputs !== 0) {
                    if (!(rule.value instanceof Array)) {
                        rule.value = [rule.value];
                    }

                    rule.value.forEach(function (v, i) {
                        if (i > 0) {
                            value += sql.sep;
                        }

                        if (
                            rule.type === 'integer' ||
                            rule.type === 'double' ||
                            rule.type === 'boolean'
                        ) {
                            v = changeType(v, rule.type, boolean_as_integer);
                        } else if (!stmt) {
                            v = escapeString(v);
                        }

                        if (sql.mod) {
                            v = fmt(sql.mod, v);
                        }

                        if (stmt) {
                            value += stmt.add(rule, v);
                        } else {
                            if (typeof v === 'string') {
                                v = `'${  v  }'`;
                            }

                            value += v;
                        }
                    });
                }

                const sqlFn = function (v) {
                    return sql.op.replace(/\?/, v);
                };

                const ruleExpression = `${rule.field  } ${  sqlFn(value)}`;

                /**
                 * Modifies the SQL generated for a rule
                 * @event changer:ruleToSQL
                 * @memberof module:plugins.SqlSupport
                 * @param {string} expression
                 * @param {Rule} rule
                 * @param {*} value
                 * @param {function} valueWrapper - function that takes the value and adds the operator
                 * @returns {string}
                 */
                parts.push(ruleExpression);
            }
        });

        const groupExpression = parts.join(` ${  group.combinator  }${nl}`);

        /**
         * Modifies the SQL generated for a group
         * @event changer:groupToSQL
         * @memberof module:plugins.SqlSupport
         * @param {string} expression
         * @param {Group} group
         * @returns {string}
         */
        return groupExpression;
    })(data);

    if (stmt) {
        return {
            sql,
            params: stmt.run(),
        };
    } 
        return {
            sql,
        };
    
};

/**
 * Parses the statement configuration
 * @memberof module:plugins.SqlSupport
 * @param {string} stmt
 * @returns {Array} null, mode, option
 * @private
 */
function getStmtConfig(stmt) {
    let config = stmt.match(/(question_mark|numbered|named)(?:\((.)\))?/);
    if (!config) config = [null, 'question_mark', undefined];
    return config;
}

export default getSQL;
