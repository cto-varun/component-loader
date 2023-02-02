import React from 'react';
import axios from 'axios';
import { nanoid } from 'nanoid';
import memoize from 'lodash.memoize';
import hash from 'object-hash';

import {
    addData,
    computedField,
    ComputedField,
    SourceField,
    queryFactory,
    dropOrCreateTable,
} from './query';
import ComponentLoader from './ComponentLoader';

const OVERWRITE = true;

let adapters = [];

export const mock = () => {
    const MockAxios = require('@ivoyant/fake-data/mock-data');
    adapters.push(MockAxios(axios));

    return MockAxios;
};

export const unmock = () => {
    adapters.forEach((adapter) => adapter.restore());
    adapters = [];
};

export default class SandboxComponent extends ComponentLoader {
    constructor(props) {
        super(props);

        this.state = Object.assign({}, this.state, {
            id: nanoid(7),
            timeout: null,
        });
    }

    stopTimer = () => {
        const { timeout } = this.state;

        if (timeout) {
            clearTimeout(timeout);
            this.setState({ timeout: null });
        }
    };

    updateData(props = this.props) {
        if (!props.datasource || !props.datasource.length) {
            return;
        }

        dropOrCreateTable(this.state.id, this.getSourceFields(props));

        if (props.url && !props.data) {
            this.retrieveData(props);
        } else {
            addData(
                this.state.id,
                this.getSourceFields(props),
                props.data,
                OVERWRITE,
                {
                    extractData: props.extractData,
                    extractFields: props.extractFields,
                }
            );
        }
    }

    request = memoize(
        (props) => {
            const { url, httpConfiguration = {} } = props;
            return axios.get(url, httpConfiguration);
        },
        ({ url, httpConfiguration = {} }, attempt = 0) => {
            return (
                url + attempt + hash(httpConfiguration, { algorithm: 'md5' })
            );
        }
    );

    retrieveData(props = this.props) {
        const { refreshInterval } = props;
        const { id, lastU } = this.state;
        let newState = {};

        this.stopTimer();

        try {
            this.request(props).then(({ data }) => {
                addData(id, this.getSourceFields(), data, OVERWRITE, {
                    extractData: props.extractData,
                    extractFields: props.extractFields,
                });

                if (refreshInterval > 0) {
                    newState.timeout = setTimeout(
                        () => request(props, lastU),
                        refreshInterval
                    );
                }
                newState.lastU = new Date().toISOString();
                this.setState(newState);
                return newState;
            });
        } catch (msg) {
            throw new Error(msg);
        }
    }

    getComponent = () =>
        this.props.component.default
            ? this.props.component.default
            : this.props.component;

    data() {
        return [
            queryFactory({
                table: this.state.id,
                fields: this.fieldsToQuery(),
            }),
        ];
    }

    datasource() {
        return this.props.datasource;
    }

    additionalProps(props) {
        let newProps = { ...props };

        delete newProps.url;
        delete newProps.refreshInterval;
        delete newProps.httpConfiguration;

        return newProps;
    }

    getSourceFields = (props = this.props) =>
        props.datasource.filter((field) => field instanceof SourceField);

    getComputedField = (props = this.props) =>
        props.datasource.filter((field) => field instanceof ComputedField);

    fieldsToQuery = () =>
        [].concat(
            this.getSourceFields().map(({ name }) => computedField(name)),
            this.getComputedField()
        );

    componentWillMount() {
        this.updateData();
    }

    componentWillReceiveProps(nextProps) {
        if (
            (nextProps.url && nextProps.url !== this.props.url) ||
            nextProps.data ||
            nextProps.datasource.length
        ) {
            this.updateData(nextProps);
        }
    }

    componentWillUnmount() {
        this.stopTimer();
    }
}

SandboxComponent.defaultProps = {
    extractData: 'raw_data',
    extractFields: 'fields',
};
