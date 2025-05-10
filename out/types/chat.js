"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMModel = exports.MessageRole = void 0;
/**
 * Message roles representing different participants in a conversation
 */
var MessageRole;
(function (MessageRole) {
    MessageRole["User"] = "user";
    MessageRole["Assistant"] = "assistant";
    MessageRole["System"] = "system"; // System messages (e.g., errors, notifications)
})(MessageRole || (exports.MessageRole = MessageRole = {}));
/**
 * @deprecated Use ModelId from 'types/models.ts' instead.
 * This type is kept for backward compatibility.
 */
var models_1 = require("./models");
Object.defineProperty(exports, "LLMModel", { enumerable: true, get: function () { return models_1.ModelId; } });
//# sourceMappingURL=chat.js.map