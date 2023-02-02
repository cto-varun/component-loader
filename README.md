## Component

General information about componetization

## What is a component?

Component is just a React element which accepts data and additional configuration via `props`. Component could be used as a standalone data visualization unit or plugged into `Dashboard`.

In order to plug in a component into `Dashboard`:

-   Publish it to NPM or any private repository;
-   Install it into a dashpbard project with NPM or YARN like that: `npm install --save your@component-name` or `yarn add your@component-name`.

## Component settings

Each component installed to dashboard has its own name and icon. Please set these properties in `package.json` as `icon`, `title`. As optional you can set a `description`.

## Component props structure

```json
{
  properties: { <properties> },
  data: [ { <query1> }, { query2 }, .., { queryN } ]
}
```

### Properties Configuration

When a component added to a dashboard a new instance of the component will be created. Each instance could be configured by using UI which is a configuration schema representation.

Configuration based on `react-json-schema` (https://github.com/mozilla-services/react-jsonschema-form) and consist of 2 parts:

-   _JSON schema_. A schema definition of a data structure which will be passed to the component instance. It can contain default data which will be passed to the instance.
-   _UI schema_. UI representation for end-used, it tells what UI widget to display behind JSON property

## Data

As you might see, `data` is an array, which means that `Dashboard` can return multiple queries per view. Each item of array represents special `Query` object. `Query` object has:

-   information about fields, separated by type;
-   possibility to modify or just execute query and get a data.

```js
{
  data: [
    {
      tableMeta: {
        allFields: [],
        labelFields: [], // fields which return String type
        valueFields: [string], // numeric fields
        timeField: string // timestamp field
      },
      queryString: object, // squel (https://hiddentao.com/squel/) query object
      alasql: <alasql instance>, //connection to Alasql,
      execute: <function(...)> // function to run a query
}
```

## Data transformation

If data provided by data source doesn't meet your component requirements you can transform in with `@antv/data-set` library.
Find out more information here ((https://translate.google.com/translate?sl=zh-CN&tl=en&js=y&prev=_t&hl=ru&ie=UTF-8&u=https%3A%2F%2Fantv.alipay.com%2Fzh-cn%2Fg2%2F3.x%2Fapi%2Fdata-set.html%23_DataSet.transforms&edit-text=)
