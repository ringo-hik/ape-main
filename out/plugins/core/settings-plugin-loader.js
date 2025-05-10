"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPluginLoader = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const plugin_1 = require("../types/plugin");
const settings_1 = require("../types/settings");
/**
 * Settings plugin loader manages loading and initializing plugin settings and JSON plugins
 */
class SettingsPluginLoader {
    _extensionContext;
    _registry;
    _settingsManager;
    // Map to track template plugins
    _templates = new Map();
    // Map to track loaded JSON plugins
    _jsonPlugins = new Map();
    // Built-in template plugin IDs
    _builtInTemplateIds = [
        'ape.jira-integration',
        'ape.bitbucket-integration',
        'ape.pocket-integration',
        'ape.swdp-integration'
    ];
    // Default template paths
    _templatesPath;
    // Disposables
    _disposables = [];
    /**
     * Creates a new settings plugin loader
     * @param _extensionContext Extension context
     * @param _registry Plugin registry
     * @param _settingsManager Plugin settings manager
     */
    constructor(_extensionContext, _registry, _settingsManager) {
        this._extensionContext = _extensionContext;
        this._registry = _registry;
        this._settingsManager = _settingsManager;
        // Initialize templates path
        this._templatesPath = path.join(this._extensionContext.extensionPath, 'resources', 'plugin-templates');
        // Create templates directory if it doesn't exist
        if (!fs.existsSync(this._templatesPath)) {
            try {
                fs.mkdirSync(this._templatesPath, { recursive: true });
            }
            catch (error) {
                console.error('Failed to create templates directory:', error);
            }
        }
        // Listen for plugin registry events
        this._disposables.push(this._registry.onDidChangePluginState(this._handlePluginStateChange.bind(this)));
        // Listen for configuration changes
        this._disposables.push(vscode.workspace.onDidChangeConfiguration(this._handleConfigChange.bind(this)));
        // Load templates and plugins
        this._loadTemplates();
        this._loadPluginSettings();
    }
    /**
     * Load plugin templates from the filesystem and settings
     */
    _loadTemplates() {
        console.log('Loading plugin templates');
        try {
            // Clear existing templates
            this._templates.clear();
            // Load built-in templates from filesystem
            this._loadBuiltInTemplates();
            // Load custom templates from settings
            this._loadCustomTemplates();
            console.log(`Loaded ${this._templates.size} plugin templates`);
        }
        catch (error) {
            console.error('Error loading plugin templates:', error);
        }
    }
    /**
     * Load built-in templates from the filesystem
     */
    _loadBuiltInTemplates() {
        try {
            // Check if templates directory exists
            if (!fs.existsSync(this._templatesPath)) {
                console.warn(`Templates directory not found: ${this._templatesPath}`);
                return;
            }
            // Check for template files
            const templateFiles = fs.readdirSync(this._templatesPath)
                .filter(file => file.endsWith('.json'));
            if (templateFiles.length === 0) {
                console.log('No template files found, creating default templates');
                this._createDefaultTemplates();
                return;
            }
            // Load each template
            for (const file of templateFiles) {
                try {
                    const filePath = path.join(this._templatesPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const template = JSON.parse(content);
                    // Validate template
                    if (!template.metadata || !template.metadata.id) {
                        console.warn(`Invalid template in ${file}: missing metadata.id`);
                        continue;
                    }
                    // Add to templates map
                    this._templates.set(template.metadata.id, template);
                    console.log(`Loaded template: ${template.metadata.id}`);
                }
                catch (error) {
                    console.error(`Error loading template ${file}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error loading built-in templates:', error);
        }
    }
    /**
     * Create default templates if they don't exist
     */
    _createDefaultTemplates() {
        // Create default templates directory
        if (!fs.existsSync(this._templatesPath)) {
            fs.mkdirSync(this._templatesPath, { recursive: true });
        }
        // Create template for Jira
        this._createJiraTemplate();
        // Create template for Bitbucket
        this._createBitbucketTemplate();
        // Create template for Pocket/S3
        this._createPocketTemplate();
        // Create template for SWDP
        this._createSWDPTemplate();
    }
    /**
     * Create Jira template
     */
    _createJiraTemplate() {
        const template = {
            metadata: {
                id: 'ape.jira-integration',
                name: 'Jira Integration',
                version: '1.0.0',
                description: 'Integration with Jira for issue management',
                author: 'APE Team',
                icon: 'jira.svg',
                category: 'Integration',
                tags: ['jira', 'issue', 'ticket']
            },
            features: [
                {
                    type: plugin_1.PluginFeatureType.SlashCommand,
                    id: 'jira-commands',
                    name: 'Jira Commands',
                    description: 'Commands for interacting with Jira'
                }
            ],
            functions: {
                'getIssue': {
                    name: 'Get Jira Issue',
                    description: 'Retrieve details for a Jira issue by key',
                    parameters: {
                        'issueKey': {
                            name: 'issueKey',
                            description: 'The Jira issue key (e.g., PROJECT-123)',
                            type: 'string',
                            required: true
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{jiraBaseUrl}',
                        path: '/rest/api/2/issue/{issueKey}',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {jiraApiToken}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Jira Issue: {{key}}\n\n**Summary**: {{fields.summary}}\n\n**Status**: {{fields.status.name}}\n\n**Assignee**: {{#fields.assignee}}{{displayName}}{{/fields.assignee}}{{^fields.assignee}}Unassigned{{/fields.assignee}}\n\n**Priority**: {{fields.priority.name}}\n\n**Description**:\n{{fields.description}}\n\n**Created**: {{fields.created}}\n**Updated**: {{fields.updated}}'
                    }
                },
                'createIssue': {
                    name: 'Create Jira Issue',
                    description: 'Create a new Jira issue',
                    parameters: {
                        'projectKey': {
                            name: 'projectKey',
                            description: 'The project key (e.g., PROJECT)',
                            type: 'string',
                            required: true
                        },
                        'issueType': {
                            name: 'issueType',
                            description: 'The type of issue to create',
                            type: 'string',
                            required: true,
                            enum: ['Bug', 'Task', 'Story', 'Epic']
                        },
                        'summary': {
                            name: 'summary',
                            description: 'Issue summary/title',
                            type: 'string',
                            required: true
                        },
                        'description': {
                            name: 'description',
                            description: 'Issue description',
                            type: 'string',
                            required: true
                        },
                        'priority': {
                            name: 'priority',
                            description: 'Issue priority',
                            type: 'string',
                            required: false,
                            enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest']
                        }
                    },
                    request: {
                        method: 'POST',
                        baseUrl: '{jiraBaseUrl}',
                        path: '/rest/api/2/issue',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {jiraApiToken}'
                        },
                        body: {
                            "fields": {
                                "project": {
                                    "key": "{projectKey}"
                                },
                                "summary": "{summary}",
                                "description": "{description}",
                                "issuetype": {
                                    "name": "{issueType}"
                                },
                                "priority": {
                                    "name": "{priority}"
                                }
                            }
                        }
                    },
                    response: {
                        parse: 'json',
                        template: 'Created Jira issue: [{{key}}]({jiraBaseUrl}/browse/{{key}})\n\n**Summary**: {{summary}}'
                    }
                },
                'searchIssues': {
                    name: 'Search Jira Issues',
                    description: 'Search for Jira issues using JQL',
                    parameters: {
                        'jql': {
                            name: 'jql',
                            description: 'Jira Query Language search string',
                            type: 'string',
                            required: true
                        },
                        'maxResults': {
                            name: 'maxResults',
                            description: 'Maximum number of results to return',
                            type: 'number',
                            required: false,
                            default: 10
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{jiraBaseUrl}',
                        path: '/rest/api/2/search',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {jiraApiToken}'
                        },
                        query: {
                            'jql': '{jql}',
                            'maxResults': '{maxResults}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Jira Issues\n\n{{#issues}}- [{{key}}]({{jiraBaseUrl}}/browse/{{key}}) - {{fields.summary}} ({{fields.status.name}})\n{{/issues}}\n\nTotal: {{total}} issues',
                        dataPath: 'issues'
                    }
                }
            },
            auth: {
                type: 'bearer',
                instructions: 'Generate an API token from your Jira account settings',
                fields: {
                    token: {
                        description: 'Jira API Token',
                        required: true
                    }
                }
            },
            llmIntegration: {
                useForParameterExtraction: true,
                useForResponseFormatting: true
            },
            configuration: {
                properties: {
                    jiraBaseUrl: {
                        type: 'string',
                        default: 'https://your-instance.atlassian.net',
                        description: 'Base URL for your Jira instance'
                    },
                    jiraApiToken: {
                        type: 'string',
                        default: '',
                        description: 'API token for Jira authentication'
                    },
                    defaultProject: {
                        type: 'string',
                        default: '',
                        description: 'Default Jira project key to use'
                    }
                }
            }
        };
        // Save template to file
        const filePath = path.join(this._templatesPath, 'jira-plugin.json');
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
        // Add to templates map
        this._templates.set(template.metadata.id, template);
        console.log(`Created Jira template: ${template.metadata.id}`);
    }
    /**
     * Create Bitbucket template
     */
    _createBitbucketTemplate() {
        const template = {
            metadata: {
                id: 'ape.bitbucket-integration',
                name: 'Bitbucket Integration',
                version: '1.0.0',
                description: 'Integration with Bitbucket for code repositories',
                author: 'APE Team',
                icon: 'bitbucket.svg',
                category: 'Integration',
                tags: ['bitbucket', 'git', 'repository', 'PR']
            },
            features: [
                {
                    type: plugin_1.PluginFeatureType.SlashCommand,
                    id: 'bitbucket-commands',
                    name: 'Bitbucket Commands',
                    description: 'Commands for interacting with Bitbucket'
                }
            ],
            functions: {
                'getPullRequests': {
                    name: 'Get Pull Requests',
                    description: 'List pull requests for a repository',
                    parameters: {
                        'workspace': {
                            name: 'workspace',
                            description: 'Bitbucket workspace name',
                            type: 'string',
                            required: true
                        },
                        'repository': {
                            name: 'repository',
                            description: 'Repository name',
                            type: 'string',
                            required: true
                        },
                        'state': {
                            name: 'state',
                            description: 'PR state to filter by',
                            type: 'string',
                            required: false,
                            enum: ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'],
                            default: 'OPEN'
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{bitbucketBaseUrl}',
                        path: '/2.0/repositories/{workspace}/{repository}/pullrequests',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {bitbucketApiToken}'
                        },
                        query: {
                            'state': '{state}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Bitbucket Pull Requests\n\n{{#values}}- [PR #{{id}}]({{links.html.href}}) - {{title}} ({{state}})\n  Author: {{author.display_name}}, Updated: {{updated_on}}\n{{/values}}\n\nTotal: {{size}} pull requests',
                        dataPath: 'values'
                    }
                },
                'createPullRequest': {
                    name: 'Create Pull Request',
                    description: 'Create a new pull request',
                    parameters: {
                        'workspace': {
                            name: 'workspace',
                            description: 'Bitbucket workspace name',
                            type: 'string',
                            required: true
                        },
                        'repository': {
                            name: 'repository',
                            description: 'Repository name',
                            type: 'string',
                            required: true
                        },
                        'title': {
                            name: 'title',
                            description: 'PR title',
                            type: 'string',
                            required: true
                        },
                        'description': {
                            name: 'description',
                            description: 'PR description',
                            type: 'string',
                            required: true
                        },
                        'sourceBranch': {
                            name: 'sourceBranch',
                            description: 'Source branch name',
                            type: 'string',
                            required: true
                        },
                        'targetBranch': {
                            name: 'targetBranch',
                            description: 'Target branch name',
                            type: 'string',
                            required: true,
                            default: 'main'
                        }
                    },
                    request: {
                        method: 'POST',
                        baseUrl: '{bitbucketBaseUrl}',
                        path: '/2.0/repositories/{workspace}/{repository}/pullrequests',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {bitbucketApiToken}'
                        },
                        body: {
                            "title": "{title}",
                            "description": "{description}",
                            "source": {
                                "branch": {
                                    "name": "{sourceBranch}"
                                }
                            },
                            "destination": {
                                "branch": {
                                    "name": "{targetBranch}"
                                }
                            }
                        }
                    },
                    response: {
                        parse: 'json',
                        template: 'Created pull request: [PR #{{id}}]({{links.html.href}})\n\n**Title**: {{title}}\n**Description**:\n{{description}}'
                    }
                },
                'getRepositories': {
                    name: 'Get Repositories',
                    description: 'List repositories in a workspace',
                    parameters: {
                        'workspace': {
                            name: 'workspace',
                            description: 'Bitbucket workspace name',
                            type: 'string',
                            required: true
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{bitbucketBaseUrl}',
                        path: '/2.0/repositories/{workspace}',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {bitbucketApiToken}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Bitbucket Repositories\n\n{{#values}}- [{{name}}]({{links.html.href}}) - {{description}}\n  Updated: {{updated_on}}\n{{/values}}\n\nTotal: {{size}} repositories',
                        dataPath: 'values'
                    }
                }
            },
            auth: {
                type: 'bearer',
                instructions: 'Generate an access token in your Bitbucket account settings',
                fields: {
                    token: {
                        description: 'Bitbucket API Token',
                        required: true
                    }
                }
            },
            llmIntegration: {
                useForParameterExtraction: true,
                useForResponseFormatting: true
            },
            configuration: {
                properties: {
                    bitbucketBaseUrl: {
                        type: 'string',
                        default: 'https://api.bitbucket.org',
                        description: 'Base URL for Bitbucket API'
                    },
                    bitbucketApiToken: {
                        type: 'string',
                        default: '',
                        description: 'API token for Bitbucket authentication'
                    },
                    defaultWorkspace: {
                        type: 'string',
                        default: '',
                        description: 'Default Bitbucket workspace'
                    }
                }
            }
        };
        // Save template to file
        const filePath = path.join(this._templatesPath, 'bitbucket-plugin.json');
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
        // Add to templates map
        this._templates.set(template.metadata.id, template);
        console.log(`Created Bitbucket template: ${template.metadata.id}`);
    }
    /**
     * Create Pocket/S3 template
     */
    _createPocketTemplate() {
        const template = {
            metadata: {
                id: 'ape.pocket-integration',
                name: 'Pocket (S3) Integration',
                version: '1.0.0',
                description: 'Integration with Pocket/S3 for file storage',
                author: 'APE Team',
                icon: 's3.svg',
                category: 'Integration',
                tags: ['pocket', 's3', 'storage', 'files']
            },
            features: [
                {
                    type: plugin_1.PluginFeatureType.SlashCommand,
                    id: 'pocket-commands',
                    name: 'Pocket Commands',
                    description: 'Commands for interacting with Pocket/S3'
                }
            ],
            functions: {
                'listBuckets': {
                    name: 'List Buckets',
                    description: 'List available S3 buckets',
                    parameters: {},
                    request: {
                        method: 'GET',
                        baseUrl: '{s3BaseUrl}',
                        path: '/buckets',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {s3ApiToken}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Available S3 Buckets\n\n{{#buckets}}- {{name}} (Created: {{creationDate}})\n{{/buckets}}',
                        dataPath: 'buckets'
                    }
                },
                'listObjects': {
                    name: 'List Objects',
                    description: 'List objects in an S3 bucket',
                    parameters: {
                        'bucket': {
                            name: 'bucket',
                            description: 'Bucket name',
                            type: 'string',
                            required: true
                        },
                        'prefix': {
                            name: 'prefix',
                            description: 'Object prefix (folder path)',
                            type: 'string',
                            required: false,
                            default: ''
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{s3BaseUrl}',
                        path: '/buckets/{bucket}/objects',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {s3ApiToken}'
                        },
                        query: {
                            'prefix': '{prefix}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Objects in Bucket: {{bucket}}\n\n{{#objects}}{{#isFolder}}- 📁 {{name}}\n{{/isFolder}}{{^isFolder}}- 📄 {{name}} ({{sizeFormatted}})\n{{/isFolder}}{{/objects}}\n\nTotal: {{count}} objects',
                        dataPath: 'objects'
                    }
                },
                'getObject': {
                    name: 'Get Object',
                    description: 'Get details and download URL for an S3 object',
                    parameters: {
                        'bucket': {
                            name: 'bucket',
                            description: 'Bucket name',
                            type: 'string',
                            required: true
                        },
                        'key': {
                            name: 'key',
                            description: 'Object key (path)',
                            type: 'string',
                            required: true
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{s3BaseUrl}',
                        path: '/buckets/{bucket}/objects/{key}',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {s3ApiToken}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Object Details\n\n**Name**: {{key}}\n**Size**: {{sizeFormatted}}\n**Type**: {{contentType}}\n**Last Modified**: {{lastModified}}\n\n**Download URL**: [Download]({{downloadUrl}})',
                        dataPath: ''
                    }
                }
            },
            auth: {
                type: 'bearer',
                instructions: 'Use your S3 access token for authentication',
                fields: {
                    token: {
                        description: 'S3 API Token',
                        required: true
                    }
                }
            },
            llmIntegration: {
                useForParameterExtraction: true,
                useForResponseFormatting: true
            },
            configuration: {
                properties: {
                    s3BaseUrl: {
                        type: 'string',
                        default: 'https://api.internal.company.com/s3-proxy',
                        description: 'Base URL for S3 proxy API'
                    },
                    s3ApiToken: {
                        type: 'string',
                        default: '',
                        description: 'API token for S3 authentication'
                    },
                    defaultBucket: {
                        type: 'string',
                        default: '',
                        description: 'Default S3 bucket to use'
                    }
                }
            }
        };
        // Save template to file
        const filePath = path.join(this._templatesPath, 'pocket-plugin.json');
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
        // Add to templates map
        this._templates.set(template.metadata.id, template);
        console.log(`Created Pocket template: ${template.metadata.id}`);
    }
    /**
     * Create SWDP template
     */
    _createSWDPTemplate() {
        const template = {
            metadata: {
                id: 'ape.swdp-integration',
                name: 'SWDP Integration',
                version: '1.0.0',
                description: 'Integration with Software Development Platform',
                author: 'APE Team',
                icon: 'workflow.svg',
                category: 'Integration',
                tags: ['swdp', 'workflow', 'development']
            },
            features: [
                {
                    type: plugin_1.PluginFeatureType.SlashCommand,
                    id: 'swdp-commands',
                    name: 'SWDP Commands',
                    description: 'Commands for interacting with SWDP'
                }
            ],
            functions: {
                'getProjects': {
                    name: 'Get Projects',
                    description: 'List available projects in SWDP',
                    parameters: {
                        'status': {
                            name: 'status',
                            description: 'Project status to filter by',
                            type: 'string',
                            required: false,
                            enum: ['active', 'completed', 'planned', 'all'],
                            default: 'active'
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{swdpBaseUrl}',
                        path: '/api/projects',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {swdpApiToken}'
                        },
                        query: {
                            'status': '{status}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## SWDP Projects\n\n{{#projects}}- **{{name}}** ({{code}})\n  Status: {{status}} | Lead: {{leadName}}\n  {{description}}\n{{/projects}}\n\nTotal: {{count}} projects',
                        dataPath: 'projects'
                    }
                },
                'getWorkflows': {
                    name: 'Get Workflows',
                    description: 'List available workflows for a project',
                    parameters: {
                        'projectCode': {
                            name: 'projectCode',
                            description: 'Project code',
                            type: 'string',
                            required: true
                        }
                    },
                    request: {
                        method: 'GET',
                        baseUrl: '{swdpBaseUrl}',
                        path: '/api/projects/{projectCode}/workflows',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {swdpApiToken}'
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Workflows for Project: {{projectCode}}\n\n{{#workflows}}- **{{name}}** ({{id}})\n  Status: {{status}}\n  {{description}}\n{{/workflows}}\n\nTotal: {{count}} workflows',
                        dataPath: 'workflows'
                    }
                },
                'triggerWorkflow': {
                    name: 'Trigger Workflow',
                    description: 'Trigger a workflow execution',
                    parameters: {
                        'projectCode': {
                            name: 'projectCode',
                            description: 'Project code',
                            type: 'string',
                            required: true
                        },
                        'workflowId': {
                            name: 'workflowId',
                            description: 'Workflow ID',
                            type: 'string',
                            required: true
                        },
                        'parameters': {
                            name: 'parameters',
                            description: 'Workflow parameters (JSON string)',
                            type: 'string',
                            required: false
                        }
                    },
                    request: {
                        method: 'POST',
                        baseUrl: '{swdpBaseUrl}',
                        path: '/api/projects/{projectCode}/workflows/{workflowId}/trigger',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {swdpApiToken}'
                        },
                        body: {
                            "parameters": "{parameters}"
                        }
                    },
                    response: {
                        parse: 'json',
                        template: '## Workflow Triggered\n\n**Execution ID**: {{executionId}}\n**Status**: {{status}}\n**Project**: {{projectCode}}\n**Workflow**: {{workflowName}}\n\nMonitor progress at: [Execution Details]({{executionUrl}})',
                        dataPath: ''
                    }
                }
            },
            auth: {
                type: 'bearer',
                instructions: 'Use your SWDP API token for authentication',
                fields: {
                    token: {
                        description: 'SWDP API Token',
                        required: true
                    }
                }
            },
            llmIntegration: {
                useForParameterExtraction: true,
                useForResponseFormatting: true
            },
            configuration: {
                properties: {
                    swdpBaseUrl: {
                        type: 'string',
                        default: 'https://swdp.internal.company.com',
                        description: 'Base URL for SWDP API'
                    },
                    swdpApiToken: {
                        type: 'string',
                        default: '',
                        description: 'API token for SWDP authentication'
                    },
                    defaultProject: {
                        type: 'string',
                        default: '',
                        description: 'Default project code to use'
                    }
                }
            }
        };
        // Save template to file
        const filePath = path.join(this._templatesPath, 'swdp-plugin.json');
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
        // Add to templates map
        this._templates.set(template.metadata.id, template);
        console.log(`Created SWDP template: ${template.metadata.id}`);
    }
    /**
     * Load custom templates from settings
     */
    _loadCustomTemplates() {
        try {
            // Get custom templates from settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            const customTemplates = pluginSettings.customTemplates || [];
            // Load each custom template
            for (const template of customTemplates) {
                if (!template || !template.id || !template.definition) {
                    continue;
                }
                try {
                    const templateSchema = template.definition;
                    // Validate template
                    if (!templateSchema.metadata || !templateSchema.metadata.id) {
                        console.warn(`Invalid custom template: ${template.id}`);
                        continue;
                    }
                    // Add to templates map
                    this._templates.set(template.id, templateSchema);
                    console.log(`Loaded custom template: ${template.id}`);
                }
                catch (error) {
                    console.error(`Error loading custom template ${template.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error loading custom templates:', error);
        }
    }
    /**
     * Load settings for all plugins from configuration
     */
    _loadPluginSettings() {
        console.log('Loading plugin settings from configuration');
        try {
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Clear existing JSON plugins
            this._jsonPlugins.clear();
            // Process each plugin in settings
            Object.entries(pluginSettings).forEach(([pluginId, settings]) => {
                // Skip non-plugin entries
                if (pluginId === 'customPlugins' || pluginId === 'customTemplates') {
                    return;
                }
                // Check if this is a built-in template
                if (this._builtInTemplateIds.includes(pluginId)) {
                    this._processBuiltInTemplate(pluginId, settings);
                }
                else {
                    // Process as a normal plugin
                    this._processPluginSettings(pluginId, settings);
                }
            });
            // Process custom plugins from settings
            const customPlugins = pluginSettings.customPlugins || [];
            customPlugins.forEach((customPlugin) => {
                if (customPlugin && customPlugin.id && customPlugin.settings) {
                    this._processCustomPlugin(customPlugin.id, customPlugin.settings);
                }
            });
            // Register all loaded JSON plugins with the registry
            this._registerJsonPlugins();
            console.log(`Loaded ${this._jsonPlugins.size} JSON plugins from settings`);
        }
        catch (error) {
            console.error('Error loading plugin settings:', error);
        }
    }
    /**
     * Process a built-in template plugin
     * @param pluginId Plugin ID
     * @param settings Plugin settings
     */
    _processBuiltInTemplate(pluginId, settings) {
        try {
            // Skip disabled plugins
            if (settings?.disabled === true) {
                console.log(`Skipping disabled template plugin: ${pluginId}`);
                return;
            }
            // Get the template
            const template = this._templates.get(pluginId);
            if (!template) {
                console.warn(`Template not found for plugin: ${pluginId}`);
                return;
            }
            // Create a copy of the template with settings applied
            const pluginSchema = JSON.parse(JSON.stringify(template));
            // Apply configuration from settings
            if (settings && pluginSchema.configuration?.properties) {
                Object.entries(pluginSchema.configuration.properties).forEach(([key, prop]) => {
                    const settingValue = settings[key];
                    if (settingValue !== undefined) {
                        // Store the setting value in a way that can be referenced in templates
                        pluginSchema[key] = settingValue;
                    }
                });
            }
            // Add to JSON plugins map
            this._jsonPlugins.set(pluginId, pluginSchema);
            console.log(`Processed template plugin: ${pluginId}`);
        }
        catch (error) {
            console.error(`Error processing template plugin ${pluginId}:`, error);
        }
    }
    /**
     * Process a plugin from settings
     * @param pluginId Plugin ID
     * @param settings Plugin settings
     */
    _processPluginSettings(pluginId, settings) {
        try {
            // Skip disabled plugins
            if (settings?.disabled === true) {
                return;
            }
            // Get the existing plugin
            const plugin = this._registry.getPlugin(pluginId);
            if (plugin) {
                console.log(`Configuring plugin ${pluginId}`);
                // Apply settings schema if plugin has configuration metadata
                if (plugin.metadata.configuration) {
                    this._registerPluginSettingsSchema(plugin);
                }
                // Apply settings
                this._applyPluginSettings(pluginId, settings);
            }
            else {
                console.log(`Plugin ${pluginId} not found in registry but has settings`);
            }
        }
        catch (error) {
            console.error(`Error processing plugin settings for ${pluginId}:`, error);
        }
    }
    /**
     * Process a custom plugin from settings
     * @param pluginId Plugin ID
     * @param settings Plugin settings including JSON definition
     */
    _processCustomPlugin(pluginId, settings) {
        try {
            // Skip disabled plugins
            if (settings?.disabled === true) {
                console.log(`Skipping disabled custom plugin: ${pluginId}`);
                return;
            }
            // Check for plugin definition
            if (!settings.definition) {
                console.warn(`Custom plugin ${pluginId} has no definition`);
                return;
            }
            // Parse the definition
            const pluginSchema = settings.definition;
            // Validate plugin
            if (!pluginSchema.metadata || !pluginSchema.metadata.id) {
                console.warn(`Invalid custom plugin: ${pluginId}`);
                return;
            }
            // Apply settings to configuration
            if (settings.config && pluginSchema.configuration?.properties) {
                Object.entries(settings.config).forEach(([key, value]) => {
                    if (pluginSchema.configuration?.properties[key]) {
                        // Store the setting value in a way that can be referenced in templates
                        pluginSchema[key] = value;
                    }
                });
            }
            // Add to JSON plugins map
            this._jsonPlugins.set(pluginId, pluginSchema);
            console.log(`Processed custom plugin: ${pluginId}`);
        }
        catch (error) {
            console.error(`Error processing custom plugin ${pluginId}:`, error);
        }
    }
    /**
     * Register all loaded JSON plugins with the plugin registry
     */
    _registerJsonPlugins() {
        // Convert JSON plugins to plugin metadata
        for (const [pluginId, pluginSchema] of this._jsonPlugins.entries()) {
            try {
                // Create JSON plugin config from schema
                const config = {
                    id: pluginId,
                    name: pluginSchema.metadata.name,
                    description: pluginSchema.metadata.description || '',
                    version: pluginSchema.metadata.version,
                    author: pluginSchema.metadata.author,
                    icon: pluginSchema.metadata.icon,
                    enabled: true,
                    config: {
                        type: 'json',
                        schema: pluginSchema
                    }
                };
                // Convert to plugin metadata
                const metadata = (0, settings_1.jsonConfigToMetadata)(config);
                // Create a mock plugin implementation
                const mockPlugin = {
                    activate: async (context) => { },
                    deactivate: async () => { }
                };
                // Register with the registry
                this._registry.registerPlugin(mockPlugin, metadata);
                console.log(`Registered JSON plugin: ${pluginId}`);
            }
            catch (error) {
                console.error(`Error registering JSON plugin ${pluginId}:`, error);
            }
        }
    }
    /**
     * Register plugin settings schema with the settings manager
     * @param plugin Plugin instance
     */
    _registerPluginSettingsSchema(plugin) {
        if (!plugin.metadata.configuration) {
            return;
        }
        try {
            // Convert PluginConfigSchema to PluginSettingsSchema
            const settingsSchema = {};
            // Process each configuration property
            Object.entries(plugin.metadata.configuration.properties).forEach(([key, prop]) => {
                settingsSchema[key] = {
                    type: prop.type,
                    default: prop.default,
                    description: prop.description,
                    enum: prop.enum
                };
            });
            // Register with settings manager
            this._settingsManager.registerSettings(plugin.id, settingsSchema);
            console.log(`Registered settings schema for plugin ${plugin.id}`);
        }
        catch (error) {
            console.error(`Error registering settings schema for plugin ${plugin.id}:`, error);
        }
    }
    /**
     * Apply settings to a specific plugin
     * @param pluginId Plugin ID
     * @param settings Settings object
     */
    async _applyPluginSettings(pluginId, settings) {
        if (!settings || typeof settings !== 'object') {
            return;
        }
        try {
            const pluginConfig = this._settingsManager.getConfiguration(pluginId);
            // Apply each setting
            for (const [key, value] of Object.entries(settings)) {
                // Skip metadata properties like 'name' and 'disabled'
                if (key === 'name' || key === 'disabled' || key === 'definition' || key === 'config') {
                    continue;
                }
                // Check if value is different from current setting
                const currentValue = this._settingsManager.get(pluginId, key);
                if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
                    await this._settingsManager.update(pluginId, key, value, vscode.ConfigurationTarget.Global);
                    console.log(`Updated setting ${pluginId}.${key}`);
                }
            }
        }
        catch (error) {
            console.error(`Error applying settings for plugin ${pluginId}:`, error);
        }
    }
    /**
     * Handle plugin state changes
     * @param pluginId Plugin ID
     * @param oldState Old plugin state
     * @param newState New plugin state
     */
    _handlePluginStateChange(pluginId, oldState, newState) {
        const plugin = this._registry.getPlugin(pluginId);
        if (!plugin) {
            return;
        }
        // When a plugin becomes registered, set up its settings
        if (newState === 'registered' && plugin.metadata.configuration) {
            this._registerPluginSettingsSchema(plugin);
            // Apply any existing settings from configuration
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            const settings = pluginSettings[pluginId];
            if (settings) {
                this._applyPluginSettings(pluginId, settings);
            }
        }
    }
    /**
     * Handle configuration changes
     * @param event Configuration change event
     */
    _handleConfigChange(event) {
        // Check if plugin settings have changed
        if (event.affectsConfiguration('ape.plugins.settings')) {
            this._loadPluginSettings();
        }
    }
    /**
     * Get all available templates
     * @returns Map of templates by ID
     */
    getTemplates() {
        return new Map(this._templates);
    }
    /**
     * Get a template by ID
     * @param templateId Template ID
     * @returns Template schema or undefined
     */
    getTemplate(templateId) {
        return this._templates.get(templateId);
    }
    /**
     * Create a new plugin from a template
     * @param templateId Template ID
     * @param pluginId New plugin ID
     * @param customizations Custom configuration values
     * @returns Promise resolving to true if successful
     */
    async createPluginFromTemplate(templateId, pluginId, customizations) {
        try {
            // Get the template
            const template = this._templates.get(templateId);
            if (!template) {
                throw new Error(`Template not found: ${templateId}`);
            }
            // Create a copy of the template
            const pluginSchema = JSON.parse(JSON.stringify(template));
            // Update plugin ID and apply customizations
            pluginSchema.metadata.id = pluginId;
            // Apply customizations to configuration
            if (pluginSchema.configuration?.properties) {
                Object.keys(pluginSchema.configuration.properties).forEach(key => {
                    if (customizations[key] !== undefined) {
                        // Store the customized value so it can be referenced in templates
                        pluginSchema[key] = customizations[key];
                    }
                });
            }
            // Get current plugin settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Create settings entry for the new plugin
            if (!pluginSettings.customPlugins) {
                pluginSettings.customPlugins = [];
            }
            // Add to custom plugins
            pluginSettings.customPlugins.push({
                id: pluginId,
                template: templateId,
                settings: {
                    name: pluginSchema.metadata.name,
                    definition: pluginSchema,
                    config: customizations
                }
            });
            // Save settings
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Reload plugins
            this._loadPluginSettings();
            return true;
        }
        catch (error) {
            console.error(`Error creating plugin from template:`, error);
            return false;
        }
    }
    /**
     * Customize a template and save it as a custom template
     * @param templateId Original template ID
     * @param newTemplateId New template ID
     * @param customizations Customizations to apply to the template
     * @returns Promise resolving to true if successful
     */
    async customizeTemplate(templateId, newTemplateId, customizations) {
        try {
            // Check if template customization is enabled
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const enableTemplateCustomization = config.get('enableTemplateCustomization', true);
            if (!enableTemplateCustomization) {
                throw new Error('Template customization is disabled in settings');
            }
            // Get the template
            const template = this._templates.get(templateId);
            if (!template) {
                throw new Error(`Template not found: ${templateId}`);
            }
            // Create a copy of the template
            const templateSchema = JSON.parse(JSON.stringify(template));
            // Update template ID and metadata
            templateSchema.metadata.id = newTemplateId;
            if (customizations.name) {
                templateSchema.metadata.name = customizations.name;
            }
            if (customizations.description) {
                templateSchema.metadata.description = customizations.description;
            }
            templateSchema.metadata.author = 'Custom';
            // Apply customizations to configuration default values
            if (templateSchema.configuration?.properties) {
                Object.entries(customizations).forEach(([key, value]) => {
                    if (templateSchema.configuration?.properties[key]) {
                        templateSchema.configuration.properties[key].default = value;
                    }
                });
            }
            // Apply customizations to functions
            if (customizations.functions && typeof customizations.functions === 'object') {
                // Handle function customizations (templates, parameters, etc.)
                Object.entries(customizations.functions).forEach(([funcName, funcCustomizations]) => {
                    if (templateSchema.functions[funcName] && typeof funcCustomizations === 'object') {
                        const func = templateSchema.functions[funcName];
                        const customFunc = funcCustomizations;
                        // Apply template customization
                        if (customFunc.template) {
                            func.response.template = customFunc.template;
                        }
                        // Apply parameter customizations
                        if (customFunc.parameters && typeof customFunc.parameters === 'object') {
                            Object.entries(customFunc.parameters).forEach(([paramName, paramCustomization]) => {
                                if (func.parameters[paramName] && typeof paramCustomization === 'object') {
                                    Object.assign(func.parameters[paramName], paramCustomization);
                                }
                            });
                        }
                    }
                });
            }
            // Get current plugin settings
            const pluginSettings = config.get('settings', {});
            // Create custom templates array if it doesn't exist
            if (!pluginSettings.customTemplates) {
                pluginSettings.customTemplates = [];
            }
            // Check if template already exists
            const existingIndex = pluginSettings.customTemplates.findIndex((t) => t.id === newTemplateId);
            // Create template entry
            const templateEntry = {
                id: newTemplateId,
                originalTemplate: templateId,
                definition: templateSchema,
                customizations
            };
            // Add or update template
            if (existingIndex >= 0) {
                pluginSettings.customTemplates[existingIndex] = templateEntry;
            }
            else {
                pluginSettings.customTemplates.push(templateEntry);
            }
            // Save settings
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Add to templates map
            this._templates.set(newTemplateId, templateSchema);
            return true;
        }
        catch (error) {
            console.error(`Error customizing template:`, error);
            return false;
        }
    }
    /**
     * Get customizable fields for a template
     * @param templateId Template ID
     * @returns Array of customizable field definitions
     */
    getTemplateCustomizableFields(templateId) {
        // Get the template
        const template = this._templates.get(templateId);
        if (!template) {
            return [];
        }
        const fields = [];
        // Add basic metadata fields
        fields.push({
            path: 'metadata.name',
            name: 'Template Name',
            description: 'Display name for the template',
            type: 'string',
            defaultValue: template.metadata.name
        }, {
            path: 'metadata.description',
            name: 'Description',
            description: 'Description of the template functionality',
            type: 'string',
            defaultValue: template.metadata.description || ''
        });
        // Add configuration properties
        if (template.configuration?.properties) {
            Object.entries(template.configuration.properties).forEach(([key, prop]) => {
                fields.push({
                    path: key,
                    name: key,
                    description: prop.description || `Configuration for ${key}`,
                    type: prop.type,
                    defaultValue: prop.default
                });
            });
        }
        // Add function customization fields
        Object.entries(template.functions).forEach(([funcName, func]) => {
            // Add template customization
            fields.push({
                path: `functions.${funcName}.template`,
                name: `${funcName} Template`,
                description: `Response template for ${funcName} function`,
                type: 'string',
                defaultValue: func.response.template
            });
            // Add parameter customizations
            Object.entries(func.parameters).forEach(([paramName, param]) => {
                if (param.default !== undefined) {
                    fields.push({
                        path: `functions.${funcName}.parameters.${paramName}.default`,
                        name: `${funcName}.${paramName} Default`,
                        description: `Default value for ${paramName} parameter in ${funcName}`,
                        type: param.type,
                        defaultValue: param.default
                    });
                }
            });
        });
        return fields;
    }
    /**
     * Delete a custom template
     * @param templateId Template ID to delete
     * @returns Promise resolving to true if successful
     */
    async deleteTemplate(templateId) {
        try {
            // Check if this is a built-in template
            if (this._builtInTemplateIds.includes(templateId)) {
                throw new Error(`Cannot delete built-in template: ${templateId}`);
            }
            // Get current plugin settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Check if template exists
            if (!pluginSettings.customTemplates) {
                return false;
            }
            // Find template index
            const templateIndex = pluginSettings.customTemplates.findIndex((t) => t.id === templateId);
            if (templateIndex < 0) {
                return false;
            }
            // Remove template
            pluginSettings.customTemplates.splice(templateIndex, 1);
            // Save settings
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Remove from templates map
            this._templates.delete(templateId);
            return true;
        }
        catch (error) {
            console.error(`Error deleting template:`, error);
            return false;
        }
    }
    /**
     * Update an existing plugin
     * @param pluginId Plugin ID
     * @param customizations Updated configuration values
     * @returns Promise resolving to true if successful
     */
    async updatePlugin(pluginId, customizations) {
        try {
            // Get current plugin settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Check if this is a built-in template
            if (this._builtInTemplateIds.includes(pluginId)) {
                // Update built-in template
                if (!pluginSettings[pluginId]) {
                    pluginSettings[pluginId] = {};
                }
                // Apply customizations
                Object.entries(customizations).forEach(([key, value]) => {
                    pluginSettings[pluginId][key] = value;
                });
            }
            else {
                // Check if it's a custom plugin
                const customPlugins = pluginSettings.customPlugins || [];
                const pluginIndex = customPlugins.findIndex((p) => p.id === pluginId);
                if (pluginIndex >= 0) {
                    // Update custom plugin configuration
                    customPlugins[pluginIndex].settings.config = {
                        ...customPlugins[pluginIndex].settings.config,
                        ...customizations
                    };
                    // Update definition with new values
                    const pluginSchema = customPlugins[pluginIndex].settings.definition;
                    if (pluginSchema && pluginSchema.configuration?.properties) {
                        Object.keys(pluginSchema.configuration.properties).forEach(key => {
                            if (customizations[key] !== undefined) {
                                pluginSchema[key] = customizations[key];
                            }
                        });
                    }
                }
                else {
                    throw new Error(`Plugin not found: ${pluginId}`);
                }
            }
            // Save settings
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Reload plugins
            this._loadPluginSettings();
            return true;
        }
        catch (error) {
            console.error(`Error updating plugin:`, error);
            return false;
        }
    }
    /**
     * Enable or disable a plugin
     * @param pluginId Plugin ID
     * @param disabled Whether to disable the plugin
     * @returns Promise resolving to true if successful
     */
    async setPluginDisabled(pluginId, disabled) {
        try {
            // Get current plugin settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Check if this is a built-in template
            if (this._builtInTemplateIds.includes(pluginId)) {
                // Update built-in template
                if (!pluginSettings[pluginId]) {
                    pluginSettings[pluginId] = {};
                }
                // Update disabled state
                pluginSettings[pluginId].disabled = disabled;
            }
            else {
                // Check if it's a custom plugin
                const customPlugins = pluginSettings.customPlugins || [];
                const pluginIndex = customPlugins.findIndex((p) => p.id === pluginId);
                if (pluginIndex >= 0) {
                    // Update disabled state
                    customPlugins[pluginIndex].settings.disabled = disabled;
                }
                else {
                    // Check if it's a normal plugin
                    const plugin = this._registry.getPlugin(pluginId);
                    if (!plugin) {
                        throw new Error(`Plugin not found: ${pluginId}`);
                    }
                    // Create settings entry if it doesn't exist
                    if (!pluginSettings[pluginId]) {
                        pluginSettings[pluginId] = {
                            name: plugin.metadata.name
                        };
                    }
                    // Update disabled state
                    pluginSettings[pluginId].disabled = disabled;
                }
            }
            // Save settings
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Update plugin state in registry
            if (disabled) {
                this._registry.deactivatePlugin(pluginId);
            }
            else {
                const plugin = this._registry.getPlugin(pluginId);
                if (plugin && plugin.state === plugin_1.PluginState.Registered) {
                    this._registry.activatePlugin(pluginId);
                }
            }
            // Reload plugins
            this._loadPluginSettings();
            return true;
        }
        catch (error) {
            console.error(`Error setting plugin disabled state:`, error);
            return false;
        }
    }
    /**
     * Delete a custom plugin
     * @param pluginId Plugin ID
     * @returns Promise resolving to true if successful
     */
    async deletePlugin(pluginId) {
        try {
            // Can't delete built-in templates
            if (this._builtInTemplateIds.includes(pluginId)) {
                throw new Error(`Cannot delete built-in template: ${pluginId}`);
            }
            // Get current plugin settings
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Check if it's a custom plugin
            if (pluginSettings.customPlugins) {
                const customPlugins = pluginSettings.customPlugins;
                const pluginIndex = customPlugins.findIndex((p) => p.id === pluginId);
                if (pluginIndex >= 0) {
                    // Remove the plugin
                    customPlugins.splice(pluginIndex, 1);
                    // Save settings
                    await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
                    // Deactivate and unregister the plugin
                    this._registry.deactivatePlugin(pluginId);
                    this._registry.unregisterPlugin(pluginId);
                    // Reload plugins
                    this._loadPluginSettings();
                    return true;
                }
            }
            throw new Error(`Custom plugin not found: ${pluginId}`);
        }
        catch (error) {
            console.error(`Error deleting plugin:`, error);
            return false;
        }
    }
    /**
     * Add a new plugin setting
     * @param pluginId Plugin ID
     * @param settings Settings object
     * @returns Promise resolving to true if successful
     */
    async addPluginSettings(pluginId, settings) {
        try {
            const config = vscode.workspace.getConfiguration('ape.plugins');
            const pluginSettings = config.get('settings', {});
            // Create or update plugin settings
            if (!pluginSettings[pluginId]) {
                pluginSettings[pluginId] = {};
            }
            // Update or add plugin settings
            pluginSettings[pluginId] = {
                ...pluginSettings[pluginId],
                ...settings
            };
            // Save back to configuration
            await config.update('settings', pluginSettings, vscode.ConfigurationTarget.Global);
            // Apply settings
            await this._applyPluginSettings(pluginId, settings);
            return true;
        }
        catch (error) {
            console.error(`Error adding plugin settings:`, error);
            return false;
        }
    }
    /**
     * Get settings for a specific plugin
     * @param pluginId Plugin ID
     * @returns Plugin settings or undefined
     */
    getPluginSettings(pluginId) {
        const config = vscode.workspace.getConfiguration('ape.plugins');
        const pluginSettings = config.get('settings', {});
        // Check if this is a built-in template
        if (this._builtInTemplateIds.includes(pluginId)) {
            return pluginSettings[pluginId];
        }
        // Check if it's a custom plugin
        const customPlugins = pluginSettings.customPlugins || [];
        const customPlugin = customPlugins.find((p) => p.id === pluginId);
        if (customPlugin) {
            return customPlugin.settings;
        }
        // Fall back to normal plugin settings
        return pluginSettings[pluginId];
    }
    /**
     * Check if a plugin is disabled in settings
     * @param pluginId Plugin ID
     * @returns Whether the plugin is disabled
     */
    isPluginDisabled(pluginId) {
        const settings = this.getPluginSettings(pluginId);
        return settings?.disabled === true;
    }
    /**
     * Initialize a new plugin with default settings
     * @param pluginId Plugin ID
     * @param metadata Plugin metadata
     * @returns Promise resolving to true if successful
     */
    async initializePluginSettings(pluginId, metadata) {
        try {
            // Check if settings already exist
            const existingSettings = this.getPluginSettings(pluginId);
            if (existingSettings) {
                return true; // Settings already exist
            }
            // Create default settings from metadata
            const defaultSettings = {
                name: metadata.name || pluginId,
                disabled: !metadata.enabled
            };
            // Add default values from configuration schema
            if (metadata.configuration?.properties) {
                Object.entries(metadata.configuration.properties).forEach(([key, prop]) => {
                    if (prop.default !== undefined) {
                        defaultSettings[key] = prop.default;
                    }
                });
            }
            // Save to configuration
            await this.addPluginSettings(pluginId, defaultSettings);
            return true;
        }
        catch (error) {
            console.error(`Error initializing plugin settings:`, error);
            return false;
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Dispose of all disposables
        this._disposables.forEach(d => d.dispose());
        this._disposables.length = 0;
        // Clear maps
        this._templates.clear();
        this._jsonPlugins.clear();
    }
}
exports.SettingsPluginLoader = SettingsPluginLoader;
//# sourceMappingURL=settings-plugin-loader.js.map