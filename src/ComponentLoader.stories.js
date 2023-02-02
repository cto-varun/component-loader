import { storiesOf } from '@storybook/react';
import { doc } from 'storybook-readme';

import README from '../README.md';

storiesOf('General', module).add('Component structure', doc(README));
