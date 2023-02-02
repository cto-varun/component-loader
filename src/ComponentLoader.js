import React, { Component } from 'react';
import merge from 'lodash.merge';
import get from 'lodash.get';
import isEqual from 'lodash.isequal';
import { v4 as uuid } from 'uuid';
import find from 'lodash.find';
import HeaderComponent from './HeaderComponent';

import { queryFactory, tableMeta, getMultiValueFilterOptions } from './query';
import './styles.css';

// Filters
import RangeFilter from './filters/RangeFilter';
import MultiValueFilter from './filters/MultiValueFilter';

const POSITION_TOP = 'top';
const POSITION_BOTTOM = 'bottom';
const POSITION_LEFT = 'left';
const POSITION_RIGHT = 'right';
const PADDING = '10px';

const containerStyle = {
    display: 'flex',
    flexFlow: 'wrap',
};

const itemStyle = {
    flexShrink: '0',
    flexGrow: '1',
    order: 1,
};

const legendStyle = {
    flexShrink: '0',
    flexBasis: '200px',
    flexGrow: 'auto',
    wordBreak: 'break-all',
};

/**
 * Generate query and inject into component
 */
class ComponentLoader extends Component {
    state = {
        hiddenLayers: [],
        data: [],
    };

    componentDidMount() {
        const data = this.getData();
        this.setState({ data });
    }

    shouldComponentUpdate(nextProps, nextState) {
        let shouldMemoize = true;
        // Filters on* event props and children prop
        const { type } = nextProps.component;
        if (
            window[window.sessionStorage?.tabId].COM_IVOYANT_VARS
                ?.dontMemoizeComponentTypes &&
            window[
                window.sessionStorage?.tabId
            ].COM_IVOYANT_VARS?.dontMemoizeComponentTypes.includes(type)
        ) {
            return false;
        }

        // Filters on* event props and children prop
        const propsToFilter = /^on[A-Z]|children/;
        const propsToCompare = Object.keys(nextProps).filter(
            (currentProp) => !propsToFilter.test(currentProp)
        );

        for (let i = 0; i < propsToCompare.length; i += 1) {
            const prop = propsToCompare[i];

            if (prop === 'style') {
                // Lodash isEqual doesn't work for some reason so this solution will have to be used for now.
                // If we don't have this here, then the component will re-render every time the mouse moves.
                // TODO: window resize will re-render all components which causes states like modals, accordions, tabs,
                // etc. to not persist.
                const styleParams = ['width', 'height', 'transform'];
                const isParamDifferent = styleParams.some(
                    (param) =>
                        Object.hasOwnProperty.call(this.props[prop], param) &&
                        this.props[prop][param] !== nextProps[prop][param]
                );

                if (isParamDifferent) {
                    shouldMemoize = true;
                }
            } else if (prop === 'store') {
                let shouldUpdate = false;
                const tables = nextProps.queries?.map((obj) => obj.table);
                if (
                    !isEqual(
                        this.props.store?.lastUpdated,
                        nextProps.store?.lastUpdated
                    )
                ) {
                    shouldUpdate = true;
                }
                tables?.forEach((item) => {
                    if (
                        nextProps.store?.response?.[item] &&
                        !isEqual(
                            this.props?.store?.response?.[item],
                            nextProps?.store?.response?.[item]
                        )
                    ) {
                        shouldUpdate = true;
                    }
                });
                if (shouldUpdate) {
                    const data = this.getData();
                    this.setState({ data });
                    return false;
                }
            } else if (!isEqual(nextProps[prop], this.props[prop])) {
                // TBD - conditional logic could be added here for th efuture;
                shouldMemoize = false;
            }
        }

        return shouldMemoize; // true memoizes the component -> prevents a render
    }

    state = {
        hiddenLayers: [],

        multiValueFilter: {
            // Set to a string for Ant Design
            selected: [],

            // Set to an object for ALASQL
            fields: {},
        },
        rangeFilter: {
            // field: undefined,
            // start: undefined,
            // end: undefined,
        },
    };

    activeFilters() {
        const queryObject = new URLSearchParams(window.location.search);
        const r = /f(?:-(\S+))?-(\w+)$/i;
        const keys = Array.from(queryObject.keys());

        return keys
            .filter((key) => r.test(key))
            .map((key) => {
                const search = key.match(r);
                const [, scope, hash] = search;
                const values = queryObject.get(key).split(',');

                return {
                    scope,
                    hash,
                    values,
                };
            });
    }

    /** Add additional filters from UI */
    buildFilters(query) {
        const { filters = [] } = this.props;
        const appliedFilters = this.activeFilters();

        // Get active queries from header and values
        return appliedFilters
            .map((item) => {
                const searchFilter = find(filters, { hash: item.hash });

                if (!searchFilter) {
                    return null;
                }

                return {
                    ...searchFilter,
                };
            })
            .filter(
                (item) =>
                    item &&
                    query.table === item.datasource.id &&
                    item.values.length
            );
    }

    /** Group rule */
    group = (combinator, rules = []) => {
        return {
            combinator,
            id: `g-${uuid()}`,
            rules,
        };
    };

    /** Value rule */
    value = (field, operator, value) => {
        return {
            field,
            id: `r-${uuid()}`,
            operator,
            value,
        };
    };

    /**
     * Create an object with data and alasql instance
     * in order to make a component run a query
     * or access raw data
     *
     * @return {object} querySettings
     */
    applyFilters(query) {
        const combinator = this.group('and');

        this.applyGlobalFilters(query, combinator);
        this.applyAssociatedFilters(query, combinator);
        this.applyLocalFilters(query, combinator);

        /* push rest */
        if (query.conditions) {
            combinator.rules.push(query.conditions);
        }

        return {
            ...query,
            conditions: combinator,
        };
    }

    operators = {
        '=': 'equal',
        '>': 'greater',
        '<': 'less',
        '>=': 'greater_or_equal',
        '<=': 'less_or_equal',
        '!=': 'not_equal',
        LIKE: 'contains',
    };

    applyGlobalFilters(query, combinator) {
        const filters = this.buildFilters(query);

        if (filters.length === 0) {
            return;
        }

        /* convert filters to conditions */
        filters.map((filter) =>
            combinator.rules.push(
                this.value(
                    filter.field,
                    this.operators[filter.has],
                    filter.values
                )
            )
        );
    }

    applyAssociatedFilters(query, combinator) {
        const { associatedFilters } = this.props;

        if (!associatedFilters || associatedFilters.length === 0) {
            return combinator;
        }

        const fieldNames = tableMeta(query).allFields;

        /* convert filters to conditions */
        associatedFilters
            .filter(({ field }) => fieldNames.indexOf(field) !== -1) // Retrieve only valid fields
            .map(({ field, fn, value }) =>
                combinator.rules.push(this.value(field, fn, value))
            );

        return combinator;
    }

    applyLocalFilters(query, combinator) {
        const { multiValueFilter, rangeFilter } = this.state;

        // Range Filter Add To Combinator
        if (rangeFilter.field) {
            combinator.rules.push(
                this.value(
                    rangeFilter.field,
                    'greater_or_equal',
                    rangeFilter.start
                )
            );
            combinator.rules.push(
                this.value(rangeFilter.field, 'less_or_equal', rangeFilter.end)
            );
        }

        // Multi Value Filter Add To Combinator
        Object.keys(multiValueFilter.fields).forEach((item) => {
            combinator.rules.push(
                this.value(item, 'in', multiValueFilter.fields[item])
            );
        });

        return combinator;
    }

    unfilteredData() {
        const { queries = [] } = this.props;

        return queries
            .map((query) => queryFactory(query))
            .filter((item) => item.execute);
    }

    data() {
        const { queries = [] } = this.props;

        const data = queries
            .map((query) => queryFactory(this.applyFilters(query)))
            .filter((item) => item.execute);

        return data;
    }

    rangeData() {
        const { queries = [] } = this.props;
        const { rangeFilter } = this.state;

        const combinator = this.group('and');

        // Range Filter Add To Combinator
        if (rangeFilter.field) {
            combinator.rules.push(
                this.value(
                    rangeFilter.field,
                    'greater_or_equal',
                    rangeFilter.start
                )
            );
            combinator.rules.push(
                this.value(rangeFilter.field, 'less_or_equal', rangeFilter.end)
            );
        }

        return queries
            .map((query) => queryFactory({ ...query, conditions: combinator }))
            .filter((item) => item.execute);
    }

    datasource() {
        return this.data().reduce(
            (acc, { datasource }) => acc.concat(datasource),
            []
        );
    }

    // Multi Value Filter Click Handler
    multiValueFilterClickHandler = (e, data) => {
        const fields = {};
        e.forEach((item) => {
            if (!fields[data[item].field]) {
                fields[data[item].field] = [data[item].value];
            } else {
                fields[data[item].field].push(data[item].value);
            }
        });

        this.setState({
            multiValueFilter: {
                // Set to a dataString Array for Ant Design
                selected: e,

                // Set to a dataObject for ALASQL
                fields,
            },
        });
    };

    // Range Filter Click Handler
    rangeFilterClickHandler = (start, end, value) => {
        const { rangeFilter = {} } = this.props.properties;
        this.setState({
            rangeFilter: {
                field: rangeFilter.field,
                range: value,
                start,
                end,
            },
        });
    };

    // Set Component
    getComponent() {
        const {
            multiValueFilter = {},
            rangeFilter = {},
            globalHeader,
            className,
            styles,
            errorTemplate,
            disableErrorTemplate,
        } = this.props.properties;

        const {
            error,
            Content,
            componentId,
            properties,
            queries,
            layoutClassName = '',
        } = this.props;

        const {
            rangeFilter: stateRangeFilter,
            multiValueFilter: stateMultiValueFilter,
        } = this.state;

        // Error template
        const setErrorTemplate = () => {
            const html = errorTemplate;
            return (
                <div className="component-container component-container-error">
                    {/* Style */}
                    <style dangerouslySetInnerHTML={{ __html: styles }} />

                    {/* Header */}
                    <HeaderComponent header={globalHeader} />

                    {/* Error */}
                    <div
                        className="template-component"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </div>
            );
        };
        // this returns a functional component - not sure why it was implemented like this.
        return (props) => {
            const { data } = props;

            if (error && !disableErrorTemplate) {
                return setErrorTemplate();
            }
            return (
                <div
                    className={`component-container component-container-with-filter ${className} ${layoutClassName}`}
                >
                    {/* Styles */}
                    <style dangerouslySetInnerHTML={{ __html: styles }} />

                    {/* Header */}
                    <HeaderComponent header={globalHeader} data={data} />

                    {/* Range Filter */}
                    {rangeFilter.enabled && (
                        <RangeFilter
                            // eslint thinks this is a functional component yet it has access to the class methods still
                            onChange={this.rangeFilterClickHandler}
                            values={stateRangeFilter}
                            properties={properties}
                        />
                    )}

                    {/* Multi Value Filter */}
                    {multiValueFilter.enabled && (
                        <MultiValueFilter
                            onChange={this.multiValueFilterClickHandler}
                            onSearch={this.multiValueFilterSearchHandler}
                            values={stateMultiValueFilter}
                            properties={properties}
                            options={
                                getMultiValueFilterOptions({
                                    multiValueFilter:
                                        properties.multiValueFilter,
                                    queries,
                                    defaultData: this.rangeData(), // chain filters, range -> multivalue
                                }) || []
                            }
                        />
                    )}

                    {/* Main Content */}
                    <Content {...props} componentId={componentId} />
                </div>
            );
        };
    }

    handlers() {
        return this.props.handlers || {};
    }

    /**
     * Based on property `summary` renders an legend in a set of position
     *
     * @returns {React.ReactElement|undefined} React legend component
     */
    getLegendComponent() {
        const component = get(this.props, 'properties.summary.component');
        const Legend = get(this.props, `Legends.${component}`);

        return Legend;
    }

    /**
     * Feature for displaying data on chart
     *
     * @param {string|number} item Item to hide
     */
    handleHideLayer = (item) => {
        const { hiddenLayers } = this.state;

        if (hiddenLayers.indexOf(item) === -1) {
            this.setState({
                hiddenLayers: [...hiddenLayers, item],
            });
        } else {
            this.setState({
                hiddenLayers: hiddenLayers.filter((i) => i !== item),
            });
        }
    };

    legendPosition() {
        const position = get(this.props, 'properties.summary.position');
        const width = get(this.props, 'properties.summary.width', '200px');

        switch (position) {
            case POSITION_TOP:
                return {
                    paddingBottom: PADDING,
                    order: 0,
                    flexBasis: '100%',
                };
            case POSITION_LEFT:
                return {
                    order: 0,
                    paddingRight: PADDING,
                    flexBasis: width,
                };
            case POSITION_RIGHT:
                return {
                    paddingLeft: PADDING,
                    order: 2,
                    flexBasis: width,
                };
            case POSITION_BOTTOM:
            default:
                return {
                    paddingTop: PADDING,
                    order: 2,
                    flexBasis: '100%',
                };
        }
    }

    additionalProps() {
        return {};
    }

    getData() {
        const { hiddenLayers, Content } = this.props;
        const Legend = this.getLegendComponent();
        const C = this.getComponent();
        const OriginalComponent = Content;

        const newProps = {
            ...this.props,
            ...this.additionalProps(),
            handlers: {
                handleHideLayer: this.handleHideLayer,
                ...this.handlers(),
            },
        };

        if (!C) {
            return <span>Component not defined</span>;
        }

        /* Each query is an object with ALASQL instnace, raw query and run functions */
        let data = this.data();
        // let { data } = this.state;
        let dataLoaded = false;
        /* @TODO make lazy load and merge data with join, as well as datasources */
        const datasource = this.datasource();

        // if (datasource.length === 0) {
        //   return <span>No datasource were specified for a component</span>;
        // }

        // Set false if no valid request provided
        if (data.length) {
            if (C.lazy === true || C.lazy === undefined) {
                if (
                    OriginalComponent.lazy === true ||
                    OriginalComponent.lazy === undefined
                ) {
                    const allQueriesContainKey =
                        data.length === data.filter((d) => d.key).length;
                    data = data.reduce(
                        (acc, d) => {
                            const reducedData = {
                                tableMeta: merge(
                                    {},
                                    acc.tableMeta,
                                    d.tableMeta
                                ),
                                alasql: d.alasql,
                                query: d.query,
                                queryString: acc.queryString.concat(
                                    d.queryString
                                ),
                                datasource: acc.datasource.concat(d.datasource),
                                summaries: acc.summaries.concat(d.summary),
                            };
                            if (allQueriesContainKey) {
                                if (acc.data === undefined) {
                                    acc.data = {};
                                }
                                const results = d.execute();
                                acc.data[d.key] =
                                    results.length === 1 && !d.isArray
                                        ? results[0]
                                        : results;
                                reducedData.data = acc.data;
                            } else {
                                reducedData.data = acc.data.concat(d.execute());
                            }

                            return reducedData;
                        },
                        // Reduce default values:
                        {
                            tableMeta: {},
                            alasql: {},
                            query: null,
                            queryString: [],
                            datasource: [],
                            data: data[0].key ? {} : [],
                            summaries: [],
                        }
                    );
                    dataLoaded = true;
                }
                dataLoaded = true;
            } else {
                data = data.reduce(
                    (acc, d) => ({
                        tableMeta: merge({}, acc.tableMeta, d.tableMeta),
                        alasql: d.alasql,
                        query: d.query,
                        queryString: acc.queryString.concat(d.queryString),
                        datasource: acc.datasource.concat(d.datasource),
                        executies: acc.data.concat(d.execute),
                        summaries: acc.summaries.concat(d.summary),
                    }),
                    // Reduce default values:
                    {
                        tableMeta: {},
                        alasql: {},
                        query: null,
                        queryString: [],
                        datasource: [],
                        data: [],
                        summaries: [],
                    }
                );

                data.execute = () =>
                    data.executies.reduce(
                        (acc, curr) => acc.concat(curr()),
                        []
                    );
                dataLoaded = true;
            }
        } else {
            data = false;
            dataLoaded = true;
        }

        if (data)
            data.summary = (config) =>
                data.summaries.reduce((acc, s) => acc.concat(s(config)), []);

        newProps.hiddenLayers = hiddenLayers;
        if (!dataLoaded) {
            return null;
        }
        return data;
    }

    render() {
        const { hiddenLayers, Content } = this.props;
        const Legend = this.getLegendComponent();
        const C = this.getComponent();
        const OriginalComponent = Content;

        const newProps = {
            ...this.props,
            ...this.additionalProps(),
            handlers: {
                handleHideLayer: this.handleHideLayer,
                ...this.handlers(),
            },
        };

        if (!C) {
            return <span>Component not defined</span>;
        }

        /* Each query is an object with ALASQL instnace, raw query and run functions */
        let data = this.data();
        let dataLoaded = false;
        /* @TODO make lazy load and merge data with join, as well as datasources */
        const datasource = this.datasource();

        // if (datasource.length === 0) {
        //   return <span>No datasource were specified for a component</span>;
        // }

        // Set false if no valid request provided
        if (data.length) {
            if (C.lazy === true || C.lazy === undefined) {
                if (
                    OriginalComponent.lazy === true ||
                    OriginalComponent.lazy === undefined
                ) {
                    const allQueriesContainKey =
                        data.length === data.filter((d) => d.key).length;
                    data = data.reduce(
                        (acc, d) => {
                            const reducedData = {
                                tableMeta: merge(
                                    {},
                                    acc.tableMeta,
                                    d.tableMeta
                                ),
                                alasql: d.alasql,
                                query: d.query,
                                queryString: acc.queryString.concat(
                                    d.queryString
                                ),
                                datasource: acc.datasource.concat(d.datasource),
                                summaries: acc.summaries.concat(d.summary),
                            };
                            if (allQueriesContainKey) {
                                if (acc.data === undefined) {
                                    acc.data = {};
                                }
                                const results = d.execute();
                                acc.data[d.key] =
                                    results.length === 1 && !d.isArray
                                        ? results[0]
                                        : results;
                                reducedData.data = acc.data;
                            } else {
                                reducedData.data = acc.data.concat(d.execute());
                            }

                            return reducedData;
                        },
                        // Reduce default values:
                        {
                            tableMeta: {},
                            alasql: {},
                            query: null,
                            queryString: [],
                            datasource: [],
                            data: data[0].key ? {} : [],
                            summaries: [],
                        }
                    );
                    dataLoaded = true;
                }
                dataLoaded = true;
            } else {
                data = data.reduce(
                    (acc, d) => ({
                        tableMeta: merge({}, acc.tableMeta, d.tableMeta),
                        alasql: d.alasql,
                        query: d.query,
                        queryString: acc.queryString.concat(d.queryString),
                        datasource: acc.datasource.concat(d.datasource),
                        executies: acc.data.concat(d.execute),
                        summaries: acc.summaries.concat(d.summary),
                    }),
                    // Reduce default values:
                    {
                        tableMeta: {},
                        alasql: {},
                        query: null,
                        queryString: [],
                        datasource: [],
                        data: [],
                        summaries: [],
                    }
                );

                data.execute = () =>
                    data.executies.reduce(
                        (acc, curr) => acc.concat(curr()),
                        []
                    );
                dataLoaded = true;
            }
        } else {
            data = false;
            dataLoaded = true;
        }

        if (data)
            data.summary = (config) =>
                data.summaries.reduce((acc, s) => acc.concat(s(config)), []);

        newProps.hiddenLayers = hiddenLayers;
        if (!dataLoaded) {
            return null;
        }
        return Legend ? (
            <div style={containerStyle}>
                <div style={itemStyle}>
                    <C {...newProps} data={data} datasource={datasource} />
                </div>
                <div style={{ ...legendStyle, ...this.legendPosition() }}>
                    <Legend
                        {...newProps}
                        data={data.summary(newProps.properties.summary)}
                    />
                </div>
            </div>
        ) : (
            <C {...newProps} data={data} datasource={datasource} />
        );
    }
}

export default ComponentLoader;
