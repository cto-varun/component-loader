import {
    text,
    object,
    boolean,
    array,
    select,
    number,
    date,
} from '@storybook/addon-knobs';
import queryString from 'query-string';
import { computedField, sourceField } from './query';
import { version } from '../package.json';

export const fakeValues = [
    '',
    'enum',
    'address.zipCode',
    'address.city',
    'address.cityPrefix',
    'address.citySuffix',
    'address.streetName',
    'address.streetAddress',
    'address.streetSuffix',
    'address.streetPrefix',
    'address.secondaryAddress',
    'address.county',
    'address.country',
    'address.countryCode',
    'address.state',
    'address.stateAbbr',
    'address.latitude',
    'address.longitude',
    'commerce.color',
    'commerce.department',
    'commerce.productName',
    'commerce.price',
    'commerce.productAdjective',
    'commerce.productMaterial',
    'commerce.product',
    'company.suffixes',
    'company.companyName',
    'company.companySuffix',
    'company.catchPhrase',
    'company.bs',
    'company.catchPhraseAdjective',
    'company.catchPhraseDescriptor',
    'company.catchPhraseNoun',
    'company.bsAdjective',
    'company.bsBuzz',
    'company.bsNoun',
    'database.column',
    'database.type',
    'database.collation',
    'database.engine',
    'date.past',
    'date.future',
    'date.between',
    'date.recent',
    'date.soon',
    'date.month',
    'date.weekday',
    'fake',
    'finance.account',
    'finance.accountName',
    'finance.mask',
    'finance.amount',
    'finance.transactionType',
    'finance.currencyCode',
    'finance.currencyName',
    'finance.currencySymbol',
    'finance.bitcoinAddress',
    'finance.ethereumAddress',
    'finance.iban',
    'finance.bic',
    'hacker.abbreviation',
    'hacker.adjective',
    'hacker.noun',
    'hacker.verb',
    'hacker.ingverb',
    'hacker.phrase',
    'image.image',
    'image.avatar',
    'image.imageUrl',
    'image.abstract',
    'image.animals',
    'image.business',
    'image.cats',
    'image.city',
    'image.food',
    'image.nightlife',
    'image.fashion',
    'image.people',
    'image.nature',
    'image.sports',
    'image.technics',
    'image.transport',
    'image.dataUri',
    'internet.avatar',
    'internet.email',
    'internet.exampleEmail',
    'internet.userName',
    'internet.protocol',
    'internet.url',
    'internet.domainName',
    'internet.domainSuffix',
    'internet.domainWord',
    'internet.ip',
    'internet.ipv6',
    'internet.userAgent',
    'internet.color',
    'internet.mac',
    'internet.password',
    'lorem.word',
    'lorem.words',
    'lorem.sentence',
    'lorem.slug',
    'lorem.sentences',
    'lorem.paragraph',
    'lorem.paragraphs',
    'lorem.text',
    'lorem.lines',
    'name.firstName',
    'name.lastName',
    'name.findName',
    'name.jobTitle',
    'name.prefix',
    'name.suffix',
    'name.title',
    'name.jobDescriptor',
    'name.jobArea',
    'name.jobType',
    'phone.phoneNumber',
    'phone.phoneNumberFormat',
    'phone.phoneFormats',
    'random.number',
    'random.float',
    'random.arrayElement',
    'random.objectElement',
    'random.uuid',
    'random.boolean',
    'random.word',
    'random.words',
    'random.image',
    'random.locale',
    'random.alphaNumeric',
    'random.hexaDecimal',
    'system.fileName',
    'system.commonFileName',
    'system.mimeType',
    'system.commonFileType',
    'system.commonFileExt',
    'system.fileType',
    'system.fileExt',
    'system.directoryPath',
    'system.filePath',
    'system.semver',
];

export const dateKnob = (name, defaultValue, groupName) => {
    const stringTimestamp = date(name, defaultValue, groupName);
    return new Date(stringTimestamp).toISOString();
};

export const remoteConfiguration = (groupName = 'Remote Configuration') => {
    const config = {
        url: text('URL', undefined, groupName),
        refreshInterval:
            number('Refresh interval (s)', 0, {}, groupName) * 1000,
        extractData: text('Data extractor (ata)', '', 'Advanced'),
        extractFields: text('Field names extractor (ata)', '', 'Advanced'),
        httpConfiguration: {
            headers: object('Headers object', {}, groupName),
        },
    };

    const enableAuth = boolean('Authorization?', false, groupName);

    if (enableAuth) {
        config.httpConfiguration.auth = {
            username: text('Username', '', groupName),
            password: text('Password', '', groupName),
        };
    }

    return config;
};

export const dynamicFieldsKnob = (groupName = 'Dynamic fields') => {
    const numberOfComputedFields = number('Dynamic fields', 0, {}, groupName);
    const fields = [];

    for (let idx = 0; idx < numberOfComputedFields; idx++) {
        const fieldValue = text(`Computed field ${idx}: name`, '', groupName);
        if (fieldValue !== '') {
            fields.push(computedField(fieldValue));
        }
    }

    return fields;
};

export const sourceFieldsKnob = (fake = true, groupName = 'Source Fields') => {
    const numberOfFields = number('Source fields', 5, {}, groupName) || 5;
    const datasource = [];
    const forUrl = [];

    for (let idx = 0; idx < numberOfFields; idx++) {
        const nameAndType = text(`Field ${idx}: name:type`, '', groupName);
        const [name, type = 'string'] = nameAndType.split(':', 2);

        datasource[idx] = sourceField(name, type);
        if (fake) {
            const fn = select(
                `Field ${idx}: Randomizer`,
                fakeValues,
                '',
                groupName
            );
            const enumValues = text(`Field ${idx}: enum values`, '', groupName);

            if (fn === 'enum') {
                forUrl[idx] = `${name}:${enumValues}`;
            } else {
                forUrl[idx] = fn !== '' ? `${name}:${fn}` : name;
            }
        }
    }

    const validName = (name) => name && /^[a-zA-Z_][a-zA-Z0-9_:\S]*/.test(name);

    return {
        datasource: datasource.filter((item) => validName(item.name)),
        forUrl: forUrl.filter((item) => validName(item)),
    };
};

export const urlKnob = (fields, groupName = 'Fake URL') => {
    const config = {
        startDate: dateKnob('Start date', '', groupName),
        endDate: dateKnob('End date', '', groupName),
        limit: number('Number of records to return', 10, {}, groupName),
        step: select(
            'Time Interval between rows item',
            ['1s', '1m', '5m', '30m', '1h', '12h', '1d', '1M'],
            '1m',
            groupName
        ),
        fields:
            fields ||
            array(
                'Fields array to return',
                [
                    'type:phone,pc,tablet,bearer',
                    'location:Bangalore,London,Moscow,Paris',
                    'version:system.semver',
                ],
                ';',
                groupName
            ),
    };

    return `http://random.host/fake-data?${  queryString.stringify(config)}`;
};

export const JSXConfiguration = (componentName, componentVersion) => ({
    onBeforeRender: (domString) => {
        const template = `<!-- Common scripts -->
<script crossorigin src="https://unpkg.com/squel@5.12.2/dist/squel.js"></script>
<script crossorigin src="https://unpkg.com/@ivoyant/react@16.3.0-alpha.1/build/dist/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@ivoyant/react@16.3.0-alpha.1/build/dist/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@webcomponents/webcomponentsjs@2.1.3/custom-elements-es5-adapter.js"></script>
<script crossorigin src="https://unpkg.com/@ivoyant/component-loader@${version}/dist/web-loader.js" type="text/javascript"></script>

<!-- Component script -->
<script crossorigin src="https://unpkg.com/${componentName}@${componentVersion}/dist/umd.js"></script>

<!-- Component code -->
${domString}
`;

        return template
            .replace(/\{([\s\S]*?)\}(?=\s+\w+)/gim, '"$1"') // change JSX to native HTML
            .replace(/(\w+)(:\s)/gm, "'$1'$2"); // change JSON prop: to 'prop':
    },
    displayName: 'ivoyant-component',
    functionValue: (fn) => {
        return fn.componentName;
    },
});

export const staticURL =
    'http://fake-host/fake-data?startDate=2018-09-18T00:00:00.000Z&endDate=2018-09-25T23:59:59.999Z&step=1m&fields=timestamp&fields=type:phone,pc,tablet,bearer&fields=location:New York,Bangalore,London,Moscow,Paris&fields=ram&fields=model:commerce.productName&fields=version:system.semver&limit=100';
export const staticDatasource = [
    sourceField('type', 'string'),
    sourceField('timestamp', 'date'),
    sourceField('ram', 'number'),
    sourceField('location', 'string'),
    sourceField('model', 'string'),
    sourceField('version', 'string'),
    computedField('ram/100 as ComputedRam'),
];
