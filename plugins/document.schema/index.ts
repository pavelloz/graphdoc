import wrap from "word-wrap";
import {
  Directive,
  DocumentSectionInterface,
  EnumValue,
  Field,
  InputValue,
  PluginInterface,
  Schema,
  SchemaType
} from "../../lib/interface";
import {
  DocumentSection,
  ENUM,
  html,
  INPUT_OBJECT,
  INTERFACE,
  OBJECT,
  Plugin,
  SCALAR,
  UNION
} from "../../lib/utility";

const MAX_CODE_LEN = 80;

export default class SchemaPlugin extends Plugin implements PluginInterface {

  getDocuments(buildForType?: string): DocumentSectionInterface[] {
    const code = this.code(buildForType);

    if (code) {
      return [
        new DocumentSection("GraphQL Schema definition", html.code(code))
      ];
    }

    return [];
  }

  code(buildForType?: string): string {
    if (!buildForType) {
      return this.schema(this.document);
    }

    const directive = this.document.directives.find(
      eachDirective => eachDirective.name === (buildForType as string)
    );

    if (directive) {
      return this.directive(directive);
    }

    const type = this.document.types.find(
      eachType => eachType.name === (buildForType as string)
    );

    if (type) {
      switch (type.kind) {
        case SCALAR:
          return this.scalar(type);

        case OBJECT:
          return this.object(type);

        case INTERFACE:
          return this.interfaces(type);

        case UNION:
          return this.union(type);

        case ENUM:
          return this.enum(type);

        case INPUT_OBJECT:
          return this.inputObject(type);
      }
    }

    throw new TypeError("Unexpected type: " + buildForType);
  }

  argument(arg: InputValue): string {
    return (
      html.property(arg.name) +
      ": " +
      html.useIdentifier(arg.type, this.url(arg.type)) // + ' ' + this.deprecated(arg);
    );
  }

  argumentLength(arg: InputValue): number {
    return arg.name.length + 1 + html.useIdentifierLength(arg.type);
  }

  arguments(fieldOrDirectives: Field | Directive): string {
    if (fieldOrDirectives.args.length === 0) {
      return "";
    }

    return (
      "(" +
      fieldOrDirectives.args.map(arg => this.argument(arg)).join(", ") +
      ")"
    );
  }

  argumentsLength(fieldOrDirectives: Field | Directive): number {
    if (fieldOrDirectives.args.length === 0) {
      return 0;
    }

    return fieldOrDirectives.args.reduce(
      (sum, arg) => sum + this.argumentLength(arg),
      2
    );
  }

  argumentsMultiline(fieldOrDirectives: Field | Directive): string[] {
    if (fieldOrDirectives.args.length === 0) {
      return [];
    }

    const maxIndex = fieldOrDirectives.args.length - 1;
    return fieldOrDirectives.args.map((arg, index) => {
      return index < maxIndex ? this.argument(arg) + "," : this.argument(arg);
    });
  }

  argumentDescription(arg: InputValue): string[] {
    const desc =
      arg.description === null
        ? "[" + html.highlight("Not documented") + "]"
        : arg.description;

    return this.description(html.highlight(arg.name) + ": " + desc);
  }

  argumentsDescription(fieldOrDirectives: Field | Directive): string[] {
    if (fieldOrDirectives.args.length === 0) {
      return [];
    }

    const reduceArguments = (descriptions: string[], arg: InputValue) =>
      descriptions.concat(this.argumentDescription(arg));

    return fieldOrDirectives.args.reduce(reduceArguments, [
      html.comment("Arguments")
    ]);
  }

  description(description: string | null): string[] {
    if (description) {
      return wrap(description, {
        width: MAX_CODE_LEN
      })
        .split("\n")
        .map(l => html.comment(l));
    }

    return [];
  }

  directive(directive: Directive): string {
    return html.line(
      html.keyword("directive") +
        " " +
        html.keyword("@" + directive.name) +
        this.arguments(directive) +
        " on " +
        directive.locations
          .map(location => html.keyword(location))
          .join(" | ")
    );
  }

  enum(type: SchemaType): string {
    const reduceEnumValues = (lines: string[], enumValue: EnumValue) =>
      lines.concat([""], this.description(enumValue.description), [
        html.property(enumValue.name)
      ]);

    return (
      html.line(
        html.keyword("enum") + " " + html.identifier(type) + " {"
      ) +
      (type.enumValues || [])
        .reduce(reduceEnumValues, [])
        .map(line => html.line(html.tab(line)))
        .join("") +
      html.line("}")
    );
  }

  field(field: Field): string {
    const fieldDescription = this.description(field.description);
    const argumentsDescription = this.argumentsDescription(field);

    if (fieldDescription.length > 0 && argumentsDescription.length) {
      fieldDescription.push(html.comment(""));
    }


    const fieldDefinition =
      field.args.length > 0 && this.fieldLength(field) > MAX_CODE_LEN
        ? // Multiline definition:
          // fieldName(
          //     argumentName: ArgumentType, \n ...
          // ): ReturnType
          [
            html.property(field.name) + "(",
            ...this.argumentsMultiline(field).map(l => html.tab(l)),
            "): " +
              html.useIdentifier(field.type, this.url(field.type))
          ]
        : // Single line
          // fieldName(argumentName: ArgumentType): ReturnType
          [
            html.property(field.name) +
              this.arguments(field) +
              ": " +
              html.useIdentifier(field.type, this.url(field.type))
          ];

    return ([] as string[])
      .concat(fieldDescription)
      .concat(argumentsDescription)
      .concat(fieldDefinition)
      .map(line => html.line(html.tab(line)))
      .join("");
  }

  fieldLength(field: Field): number {
    return (
      field.name.length +
      this.argumentsLength(field) +
      ": ".length +
      html.useIdentifierLength(field) +
      " ".length
    );
  }

  fields(type: SchemaType): string {
    let fields = "";
    fields += html.line();
    fields += (type.fields || [])
      .filter(field => !field.isDeprecated)
      .map(field => this.field(field))
      .join(html.line());

    if (type.fields && type.fields.length > 0) {
      fields += html.line();
    }

    return fields;
  }

  inputObject(type: SchemaType): string {
    return (
      html.line(
        html.keyword("input") + " " + html.identifier(type) + " {"
      ) +
      this.inputValues(type.inputFields || []) +
      html.line("}")
    );
  }

  inputValues(inputValues: InputValue[]): string {
    return inputValues
      .map(inputValue =>
        html.line(html.tab(this.inputValue(inputValue)))
      )
      .join("");
  }

  inputValue(arg: InputValue): string {
    const argDescription = this.description(arg.description);

    return ([] as string[])
      .concat(argDescription)
      .concat([
        html.property(arg.name) +
          ": " +
          html.useIdentifier(arg.type, this.url(arg.type))
      ])
      .map(line => html.line(html.tab(line)))
      .join("");
  }

  interfaces(type: SchemaType): string {
    return (
      html.line(
        html.keyword("interface") + " " + html.identifier(type) + " {"
      ) +
      this.fields(type) +
      html.line("}")
    );
  }

  object(type: SchemaType): string {
    const interfaces = (type.interfaces || [])
      .map(i => html.useIdentifier(i, this.url(i)))
      .join(", ");

    const implement =
      interfaces.length === 0
        ? ""
        : " " + html.keyword("implements") + " " + interfaces;

    return (
      html.line(
        html.keyword("type") +
          " " +
          html.identifier(type) +
          implement +
          " {"
      ) +
      this.fields(type) +
      html.line("}")
    );
  }

  scalar(type: SchemaType): string {
    return html.line(
      html.keyword("scalar") + " " + html.identifier(type)
    );
  }

  schema(schema: Schema): string {
    let definition = html.line(html.keyword("schema") + " {");

    if (schema.queryType) {
      definition +=
        html.line() +
        this.description(schema.queryType.description)
          .map(line => html.line(html.tab(line)))
          .join("") +
        html.line(
          html.tab(
            html.property("query") +
              ": " +
              html.useIdentifier(
                schema.queryType,
                this.url(schema.queryType)
              )
          )
        );
    }

    if (schema.mutationType) {
      definition +=
        html.line() +
        this.description(schema.mutationType.description)
          .map(line => html.line(html.tab(line)))
          .join("") +
        html.line(
          html.tab(
            html.property("mutation") +
              ": " +
              html.useIdentifier(
                schema.mutationType,
                this.url(schema.mutationType)
              )
          )
        );
    }

    if (schema.subscriptionType) {
      definition +=
        html.line() +
        this.description(schema.subscriptionType.description)
          .map(line => html.line(html.tab(line)))
          .join("") +
        html.line(
          html.tab(
            html.property("subscription") +
              ": " +
              html.useIdentifier(
                schema.subscriptionType,
                this.url(schema.subscriptionType)
              )
          )
        );
    }

    definition += html.line("}");

    return definition;

  }

  union(type: SchemaType): string {
    return html.line(
      html.keyword("union") +
        " " +
        html.identifier(type) +
        " = " +
        (type.possibleTypes || [])
          .map(eachType =>
            html.useIdentifier(eachType, this.url(eachType))
          )
          .join(" | ")
    );
  }
}
