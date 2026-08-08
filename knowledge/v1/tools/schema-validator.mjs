import Ajv2020 from 'ajv/dist/2020.js';
import claimSchema from '../schemas/claim.schema.json' with { type: 'json' };
import reviewSchema from '../schemas/review.schema.json' with { type: 'json' };
import ruleSchema from '../schemas/rule.schema.json' with { type: 'json' };
import sourceSchema from '../schemas/source.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validators = {
  source: ajv.compile(sourceSchema),
  claim: ajv.compile(claimSchema),
  rule: ajv.compile(ruleSchema),
  review: ajv.compile(reviewSchema),
};

export function validateRecord(type, value) {
  const validate = validators[type];
  if (!validate) throw new TypeError(`Unknown record type: ${type}`);
  if (validate(value)) return [];

  return (validate.errors ?? [])
    .map((error) => ({
      code: 'SCHEMA_INVALID',
      path: error.instancePath || '/',
      message: error.message ?? 'schema validation failed',
    }))
    .sort((a, b) => `${a.path}:${a.message}`.localeCompare(`${b.path}:${b.message}`));
}
