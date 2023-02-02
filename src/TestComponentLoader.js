import React from 'react';
import instantiator from 'json-schema-instantiator';

import ComponentLoader from './ComponentLoader';
import { insertTestData, getSampleQueries } from './query';
import sampleDB from '../db.json';

insertTestData(sampleDB);

export default (props) => (
    <ComponentLoader
        queries={getSampleQueries()}
        properties={instantiator.instantiate(props.schema)}
        {...props}
    />
);
