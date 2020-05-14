"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var word_wrap_1 = __importDefault(require("word-wrap"));
var utility_1 = require("../../lib/utility");
var MAX_CODE_LEN = 80;
var SchemaPlugin = /** @class */ (function (_super) {
    __extends(SchemaPlugin, _super);
    function SchemaPlugin() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SchemaPlugin.prototype.getDocuments = function (buildForType) {
        var code = this.code(buildForType);
        if (code) {
            return [
                new utility_1.DocumentSection("GraphQL Schema definition", utility_1.html.code(code))
            ];
        }
        return [];
    };
    SchemaPlugin.prototype.code = function (buildForType) {
        if (!buildForType) {
            return this.schema(this.document);
        }
        var directive = this.document.directives.find(function (eachDirective) { return eachDirective.name === buildForType; });
        if (directive) {
            return this.directive(directive);
        }
        var type = this.document.types.find(function (eachType) { return eachType.name === buildForType; });
        if (type) {
            switch (type.kind) {
                case utility_1.SCALAR:
                    return this.scalar(type);
                case utility_1.OBJECT:
                    return this.object(type);
                case utility_1.INTERFACE:
                    return this.interfaces(type);
                case utility_1.UNION:
                    return this.union(type);
                case utility_1.ENUM:
                    return this.enum(type);
                case utility_1.INPUT_OBJECT:
                    return this.inputObject(type);
            }
        }
        throw new TypeError("Unexpected type: " + buildForType);
    };
    SchemaPlugin.prototype.argument = function (arg) {
        return (utility_1.html.property(arg.name) +
            ": " +
            utility_1.html.useIdentifier(arg.type, this.url(arg.type)) // + ' ' + this.deprecated(arg);
        );
    };
    SchemaPlugin.prototype.argumentLength = function (arg) {
        return arg.name.length + 1 + utility_1.html.useIdentifierLength(arg.type);
    };
    SchemaPlugin.prototype.arguments = function (fieldOrDirectives) {
        var _this = this;
        if (fieldOrDirectives.args.length === 0) {
            return "";
        }
        return ("(" +
            fieldOrDirectives.args.map(function (arg) { return _this.argument(arg); }).join(", ") +
            ")");
    };
    SchemaPlugin.prototype.argumentsLength = function (fieldOrDirectives) {
        var _this = this;
        if (fieldOrDirectives.args.length === 0) {
            return 0;
        }
        return fieldOrDirectives.args.reduce(function (sum, arg) { return sum + _this.argumentLength(arg); }, 2);
    };
    SchemaPlugin.prototype.argumentsMultiline = function (fieldOrDirectives) {
        var _this = this;
        if (fieldOrDirectives.args.length === 0) {
            return [];
        }
        var maxIndex = fieldOrDirectives.args.length - 1;
        return fieldOrDirectives.args.map(function (arg, index) {
            return index < maxIndex ? _this.argument(arg) + "," : _this.argument(arg);
        });
    };
    SchemaPlugin.prototype.argumentDescription = function (arg) {
        var desc = arg.description === null
            ? "[" + utility_1.html.highlight("Not documented") + "]"
            : arg.description;
        return this.description(utility_1.html.highlight(arg.name) + ": " + desc);
    };
    SchemaPlugin.prototype.argumentsDescription = function (fieldOrDirectives) {
        var _this = this;
        if (fieldOrDirectives.args.length === 0) {
            return [];
        }
        var reduceArguments = function (descriptions, arg) {
            return descriptions.concat(_this.argumentDescription(arg));
        };
        return fieldOrDirectives.args.reduce(reduceArguments, [
            utility_1.html.comment("Arguments")
        ]);
    };
    SchemaPlugin.prototype.description = function (description) {
        if (description) {
            return word_wrap_1.default(description, {
                width: MAX_CODE_LEN
            })
                .split("\n")
                .map(function (l) { return utility_1.html.comment(l); });
        }
        return [];
    };
    SchemaPlugin.prototype.directive = function (directive) {
        return utility_1.html.line(utility_1.html.keyword("directive") +
            " " +
            utility_1.html.keyword("@" + directive.name) +
            this.arguments(directive) +
            " on " +
            directive.locations
                .map(function (location) { return utility_1.html.keyword(location); })
                .join(" | "));
    };
    SchemaPlugin.prototype.enum = function (type) {
        var _this = this;
        var reduceEnumValues = function (lines, enumValue) {
            return lines.concat([""], _this.description(enumValue.description), [
                utility_1.html.property(enumValue.name)
            ]);
        };
        return (utility_1.html.line(utility_1.html.keyword("enum") + " " + utility_1.html.identifier(type) + " {") +
            (type.enumValues || [])
                .reduce(reduceEnumValues, [])
                .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
                .join("") +
            utility_1.html.line("}"));
    };
    SchemaPlugin.prototype.field = function (field) {
        var fieldDescription = this.description(field.description);
        var argumentsDescription = this.argumentsDescription(field);
        if (fieldDescription.length > 0 && argumentsDescription.length) {
            fieldDescription.push(utility_1.html.comment(""));
        }
        var fieldDefinition = field.args.length > 0 && this.fieldLength(field) > MAX_CODE_LEN
            ? // Multiline definition:
             __spreadArrays([
                utility_1.html.property(field.name) + "("
            ], this.argumentsMultiline(field).map(function (l) { return utility_1.html.tab(l); }), [
                "): " +
                    utility_1.html.useIdentifier(field.type, this.url(field.type))
            ]) : // Single line
            // fieldName(argumentName: ArgumentType): ReturnType
            [
                utility_1.html.property(field.name) +
                    this.arguments(field) +
                    ": " +
                    utility_1.html.useIdentifier(field.type, this.url(field.type))
            ];
        return []
            .concat(fieldDescription)
            .concat(argumentsDescription)
            .concat(fieldDefinition)
            .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
            .join("");
    };
    SchemaPlugin.prototype.fieldLength = function (field) {
        return (field.name.length +
            this.argumentsLength(field) +
            ": ".length +
            utility_1.html.useIdentifierLength(field) +
            " ".length);
    };
    SchemaPlugin.prototype.fields = function (type) {
        var _this = this;
        var fields = "";
        fields += utility_1.html.line();
        fields += (type.fields || [])
            .filter(function (field) { return !field.isDeprecated; })
            .map(function (field) { return _this.field(field); })
            .join(utility_1.html.line());
        if (type.fields && type.fields.length > 0) {
            fields += utility_1.html.line();
        }
        return fields;
    };
    SchemaPlugin.prototype.inputObject = function (type) {
        return (utility_1.html.line(utility_1.html.keyword("input") + " " + utility_1.html.identifier(type) + " {") +
            this.inputValues(type.inputFields || []) +
            utility_1.html.line("}"));
    };
    SchemaPlugin.prototype.inputValues = function (inputValues) {
        var _this = this;
        return inputValues
            .map(function (inputValue) {
            return utility_1.html.line(utility_1.html.tab(_this.inputValue(inputValue)));
        })
            .join("");
    };
    SchemaPlugin.prototype.inputValue = function (arg) {
        var argDescription = this.description(arg.description);
        return []
            .concat(argDescription)
            .concat([
            utility_1.html.property(arg.name) +
                ": " +
                utility_1.html.useIdentifier(arg.type, this.url(arg.type))
        ])
            .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
            .join("");
    };
    SchemaPlugin.prototype.interfaces = function (type) {
        return (utility_1.html.line(utility_1.html.keyword("interface") + " " + utility_1.html.identifier(type) + " {") +
            this.fields(type) +
            utility_1.html.line("}"));
    };
    SchemaPlugin.prototype.object = function (type) {
        var _this = this;
        var interfaces = (type.interfaces || [])
            .map(function (i) { return utility_1.html.useIdentifier(i, _this.url(i)); })
            .join(", ");
        var implement = interfaces.length === 0
            ? ""
            : " " + utility_1.html.keyword("implements") + " " + interfaces;
        return (utility_1.html.line(utility_1.html.keyword("type") +
            " " +
            utility_1.html.identifier(type) +
            implement +
            " {") +
            this.fields(type) +
            utility_1.html.line("}"));
    };
    SchemaPlugin.prototype.scalar = function (type) {
        return utility_1.html.line(utility_1.html.keyword("scalar") + " " + utility_1.html.identifier(type));
    };
    SchemaPlugin.prototype.schema = function (schema) {
        var definition = utility_1.html.line(utility_1.html.keyword("schema") + " {");
        if (schema.queryType) {
            definition +=
                utility_1.html.line() +
                    this.description(schema.queryType.description)
                        .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
                        .join("") +
                    utility_1.html.line(utility_1.html.tab(utility_1.html.property("query") +
                        ": " +
                        utility_1.html.useIdentifier(schema.queryType, this.url(schema.queryType))));
        }
        if (schema.mutationType) {
            definition +=
                utility_1.html.line() +
                    this.description(schema.mutationType.description)
                        .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
                        .join("") +
                    utility_1.html.line(utility_1.html.tab(utility_1.html.property("mutation") +
                        ": " +
                        utility_1.html.useIdentifier(schema.mutationType, this.url(schema.mutationType))));
        }
        if (schema.subscriptionType) {
            definition +=
                utility_1.html.line() +
                    this.description(schema.subscriptionType.description)
                        .map(function (line) { return utility_1.html.line(utility_1.html.tab(line)); })
                        .join("") +
                    utility_1.html.line(utility_1.html.tab(utility_1.html.property("subscription") +
                        ": " +
                        utility_1.html.useIdentifier(schema.subscriptionType, this.url(schema.subscriptionType))));
        }
        definition += utility_1.html.line("}");
        return definition;
    };
    SchemaPlugin.prototype.union = function (type) {
        var _this = this;
        return utility_1.html.line(utility_1.html.keyword("union") +
            " " +
            utility_1.html.identifier(type) +
            " = " +
            (type.possibleTypes || [])
                .map(function (eachType) {
                return utility_1.html.useIdentifier(eachType, _this.url(eachType));
            })
                .join(" | "));
    };
    return SchemaPlugin;
}(utility_1.Plugin));
exports.default = SchemaPlugin;
