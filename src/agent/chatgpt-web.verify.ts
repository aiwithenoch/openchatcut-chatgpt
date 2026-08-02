import assert from 'node:assert/strict';
import {
  applyAgentModelStatus,
  applyChatGptWebStatus,
  getAgentModelSnapshot,
  selectAgentModel,
} from './model-selection.ts';
import { MODEL, PROVIDER } from './providerConfig.ts';

applyAgentModelStatus({}, {});
applyChatGptWebStatus(['gpt-5.5', 'gpt-5.4-mini']);

const webModels = getAgentModelSnapshot().choices.filter((choice) => choice.backend === 'chatgpt');
assert.deepEqual(webModels.map((choice) => choice.model), ['gpt-5.5', 'gpt-5.4-mini']);
assert.equal(getAgentModelSnapshot().activeId, 'chatgpt:gpt-5.5');
assert.equal(PROVIDER, 'chatgpt');
assert.equal(MODEL, 'gpt-5.5');

selectAgentModel('chatgpt:gpt-5.4-mini');
assert.equal(PROVIDER, 'chatgpt');
assert.equal(MODEL, 'gpt-5.4-mini');

applyChatGptWebStatus([]);
assert.equal(getAgentModelSnapshot().choices.some((choice) => choice.backend === 'chatgpt'), false);

console.log('ChatGPT web model verification passed');
