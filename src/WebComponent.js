import React from 'react';
import ReactDOM from 'react-dom';
import SandboxComponent from './SandboxComponent';
import {createRoot} from 'react-dom/client'
import { sourceField, computedField } from './query';
class ComponentLoader extends HTMLElement {
    retargetEvents() {
        let events = [
            'onClick',
            'onContextMenu',
            'onDoubleClick',
            'onDrag',
            'onDragEnd',
            'onDragEnter',
            'onDragExit',
            'onDragLeave',
            'onDragOver',
            'onDragStart',
            'onDrop',
            'onMouseDown',
            'onMouseEnter',
            'onMouseLeave',
            'onMouseMove',
            'onMouseOut',
            'onMouseOver',
            'onMouseUp',
        ];

        function dispatchEvent(event, eventType, itemProps) {
            if (itemProps[eventType]) {
                itemProps[eventType](event);
            } else if (itemProps.children && itemProps.children.forEach) {
                itemProps.children.forEach((child) => {
                    child.props && dispatchEvent(event, eventType, child.props);
                });
            }
        }

        // Compatible with v0.14 & 15
        function findReactInternal(item) {
            let instance;
            for (let key in item) {
                if (
                    item.hasOwnProperty(key) &&
                    ~key.indexOf('_reactInternal')
                ) {
                    instance = item[key];
                    break;
                }
            }
            return instance;
        }

        events.forEach((eventType) => {
            let transformedEventType = eventType
                .replace(/^on/, '')
                .toLowerCase();

            this.el.addEventListener(transformedEventType, (event) => {
                for (let i in event.path) {
                    let item = event.path[i];

                    let internalComponent = findReactInternal(item);
                    if (
                        internalComponent &&
                        internalComponent._currentElement &&
                        internalComponent._currentElement.props
                    ) {
                        dispatchEvent(
                            event,
                            eventType,
                            internalComponent._currentElement.props
                        );
                    }

                    if (item == this.el) break;
                }
            });
        });
    }

    connectedCallback() {
        let properties = {},
            data,
            datasource = [],
            httpConfiguration = {};
        try {
            properties = JSON.parse(
                this.getAttribute('properties').replace(/'/g, '"')
            );
        } catch (e) {}

        try {
            httpConfiguration = JSON.parse(
                this.getAttribute('httpConfiguration').replace(/'/g, '"')
            );
        } catch (e) {}

        try {
            datasource = JSON.parse(
                this.getAttribute('datasource').replace(/'/g, '"')
            );
            datasource = datasource.map((item) =>
                item.raw
                    ? computedField(item.raw, item.fn, item.alias)
                    : sourceField(item.name, item.type)
            );
        } catch (e) {}

        try {
            data = JSON.parse(this.getAttribute('data').replace(/'/g, '"'));
        } catch (e) {}

        const mod = window[window.sessionStorage?.tabId][this.getAttribute('component')].default;
        const C = mod.component;

        /**
         * Component structure
         *
         * <MountPoint>
         *  <Style />
         *  <ContentPoint />
         * </MountPoint
         */
        // this.el = this.createShadowRoot();

        const mountPoint = document.createElement('div');
        // this.attachShadow({ mode: 'open' }).appendChild(mountPoint);
        const shadowRoot = this.createShadowRoot();
        shadowRoot.appendChild(mountPoint);
        //@TODO workaround, components should be able to use shared style as well
        const style = document.createElement('style');
        style.type = 'text/css';

        style.appendChild(document.createTextNode(mod.styles));
        mountPoint.appendChild(style);

        const contentPoint = document.createElement('div');
        mountPoint.appendChild(contentPoint);

        this.el = shadowRoot;

        // https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
        const root = createRoot(contentPoint)
        root.render(<SandboxComponent
            component={C}
            url={this.getAttribute('url')}
            refreshInterval={this.getAttribute('refreshInterval')}
            extractData={this.getAttribute('extractData')}
            extractFields={this.getAttribute('extractFields')}
            httpConfiguration={httpConfiguration}
            properties={properties}
            data={data}
            datasource={datasource}
        ></SandboxComponent>)

        this.retargetEvents();
    }
}

customElements.define('ivoyant-component', ComponentLoader);
