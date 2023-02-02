import React, { Component } from 'react';
import {createRoot} from 'react-dom/client'

import TestComponentLoader from '../src/TestComponentLoader';

class TestComponent extends Component {
    render() {
        return (
            <div>
                <em>Hello, test component,</em>
                <div style={{ border: '1px solid #FFAA0050', padding: '10px' }}>
                    <button
                        onClick={this.props.handlers.handleHideLayer.bind(
                            this,
                            'Axis A'
                        )}
                    >
                        Toggle from component: "A"
                    </button>
                    <button
                        onClick={this.props.handlers.handleHideLayer.bind(
                            this,
                            'Axis B'
                        )}
                    >
                        Toggle from component: "B"
                    </button>
                </div>
                <strong>properties:</strong>{' '}
                <pre>{JSON.stringify(this.props.properties, null, '\t')}</pre>
                <strong>query:</strong>{' '}
                <pre>{this.props.data.queryString.toString()}</pre>
            </div>
        );
    }
}

class App extends Component {
    render() {
        return (
            <div>
                <h1>Component loader demo</h1>

                <TestComponentLoader
                    properties={{
                        summary: {
                            position: 'left',
                            min: true,
                            max: true,
                            avg: true,
                            current: true,
                            field: 'revenue',
                            groups: 'type',
                            component: 'ComponentLegend',
                        },
                    }}
                    Legends={{
                        ComponentLegend: (props) => (
                            <span>
                                I'm a demo legend! Hidden layers
                                <pre>{JSON.stringify(props.hiddenLayers)}</pre>
                                <div
                                    style={{
                                        border: '1px solid #FFAA0050',
                                        padding: '10px',
                                    }}
                                >
                                    <button
                                        onClick={props.handlers.handleHideLayer.bind(
                                            this,
                                            'Axis A'
                                        )}
                                    >
                                        Toggle from Legend: "A"
                                    </button>
                                    <button
                                        onClick={props.handlers.handleHideLayer.bind(
                                            this,
                                            'Axis B'
                                        )}
                                    >
                                        Toggle from Legend: "B"
                                    </button>
                                </div>
                                {props.data.map((item, idx) => (
                                    <pre key={idx} on>
                                        {JSON.stringify(item, null, '\t')}
                                    </pre>
                                ))}
                            </span>
                        ),
                    }}
                    Content={TestComponent}
                />
            </div>
        );
    }
}
// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
const root = createRoot(document.getElementById('app'))
root.render(<App />)
 