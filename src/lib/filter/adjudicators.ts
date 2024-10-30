// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The Pepr Authors

import { Event } from "../types";
import { Operation } from "../mutate-types";
import {
  __,
  allPass,
  any,
  anyPass,
  complement,
  curry,
  defaultTo,
  difference,
  equals,
  gt,
  length,
  not,
  nthArg,
  pipe,
} from "ramda";

/*
  Naming scheme:
  - AdmissionRequest - "declares" / "neglects"
  - KuberneteskubernetesObjectect - "carries" / "missing"
  - Binding - "defines" / "ignores"
*/

/*
  AdmissionRequest collectors
*/
export const declaredOperation = pipe(request => request?.operation, defaultTo(""));
export const declaredGroup = pipe(request => request?.kind?.group, defaultTo(""));
export const declaredVersion = pipe(request => request?.kind?.version, defaultTo(""));
export const declaredKind = pipe(request => request?.kind?.kind, defaultTo(""));
export const declaredUid = pipe(request => request?.uid, defaultTo(""));

/*
  KuberneteskubernetesObjectect collectors
*/
export const carriesDeletionTimestamp = pipe(
  kubernetesObject => !!kubernetesObject.metadata?.deletionTimestamp,
  defaultTo(false),
);
export const missingDeletionTimestamp = complement(carriesDeletionTimestamp);

export const carriedKind = pipe(kubernetesObject => kubernetesObject?.metadata?.kind, defaultTo("not set"));
export const carriedVersion = pipe(kubernetesObject => kubernetesObject?.metadata?.version, defaultTo("not set"));
export const carriedName = pipe(kubernetesObject => kubernetesObject?.metadata?.name, defaultTo(""));
export const carriesName = pipe(carriedName, equals(""), not);
export const missingName = complement(carriesName);

export const carriedNamespace = pipe(kubernetesObject => kubernetesObject?.metadata?.namespace, defaultTo(""));
export const carriesNamespace = pipe(carriedNamespace, equals(""), not);

export const carriedAnnotations = pipe(kubernetesObject => kubernetesObject?.metadata?.annotations, defaultTo({}));
export const carriesAnnotations = pipe(carriedAnnotations, equals({}), not);

export const carriedLabels = pipe(kubernetesObject => kubernetesObject?.metadata?.labels, defaultTo({}));
export const carriesLabels = pipe(carriedLabels, equals({}), not);

/*
  Binding collectors
*/

export const definesDeletionTimestamp = pipe(binding => binding?.filters?.deletionTimestamp, defaultTo(false));
export const ignoresDeletionTimestamp = complement(definesDeletionTimestamp);

export const definedName = pipe(binding => binding?.filters?.name, defaultTo(""));
export const definesName = pipe(definedName, equals(""), not);
export const ignoresName = complement(definesName);

export const definedNameRegex = pipe(binding => binding?.filters?.regexName, defaultTo(""));
export const definesNameRegex = pipe(definedNameRegex, equals(""), not);

export const definedNamespaces = pipe(binding => binding?.filters?.namespaces, defaultTo([]));
export const definesNamespaces = pipe(definedNamespaces, equals([]), not);

export const definedNamespaceRegexes = pipe(binding => binding?.filters?.regexNamespaces, defaultTo([]));
export const definesNamespaceRegexes = pipe(definedNamespaceRegexes, equals([]), not);

export const definedAnnotations = pipe(binding => binding?.filters?.annotations, defaultTo({}));
export const definesAnnotations = pipe(definedAnnotations, equals({}), not);

export const definedLabels = pipe(binding => binding?.filters?.labels, defaultTo({}));
export const definesLabels = pipe(definedLabels, equals({}), not);

export const definedEvent = pipe(binding => binding?.event, defaultTo(""));
export const definesDelete = pipe(definedEvent, equals(Operation.DELETE));

export const definedGroup = pipe(binding => binding?.kind?.group, defaultTo(""));
export const definesGroup = pipe(definedGroup, equals(""), not);

export const definedVersion = pipe(binding => binding?.kind?.version, defaultTo(""));
export const definesVersion = pipe(definedVersion, equals(""), not);

export const definedKind = pipe(binding => binding?.kind?.kind, defaultTo(""));
export const definesKind = pipe(definedKind, equals(""), not);

export const definedCategory = pipe(binding => {
  // prettier-ignore
  return (
    binding.isFinalize ? "Finalize" :
    binding.isWatch ? "Watch" :
    binding.isMutate ? "Mutate" :
    binding.isValidate ? "Validate" :
    ""
  );
});

export const definedCallback = pipe(binding => {
  // prettier-ignore
  return (
    binding.isFinalize ? binding.finalizeCallback :
    binding.isWatch ? binding.watchCallback :
    binding.isMutate ? binding.mutateCallback :
    binding.isValidate ? binding.validateCallback:
    null
  );
});
export const definedCallbackName = pipe(definedCallback, defaultTo({ name: "" }), callback => callback.name);

/*
  post-collection comparitors
*/
export const mismatchedDeletionTimestamp = allPass([
  pipe(nthArg(0), definesDeletionTimestamp),
  pipe(nthArg(1), missingDeletionTimestamp),
]);

export const mismatchedName = allPass([
  pipe(nthArg(0), definesName),
  pipe((binding, kubernetesObject) => definedName(binding) !== carriedName(kubernetesObject)),
]);

export const mismatchedNameRegex = allPass([
  pipe(nthArg(0), definesNameRegex),
  pipe((binding, kubernetesObject) => new RegExp(definedNameRegex(binding)).test(carriedName(kubernetesObject)), not),
]);

export const bindsToKind = curry(
  allPass([pipe(nthArg(0), definedKind, equals(""), not), pipe((binding, kind) => definedKind(binding) === kind)]),
);
export const bindsToNamespace = curry(pipe(bindsToKind(__, "Namespace")));
export const misboundNamespace = allPass([bindsToNamespace, definesNamespaces]);

export const mismatchedNamespace = allPass([
  pipe(nthArg(0), definesNamespaces),
  pipe((binding, kubernetesObject) => definedNamespaces(binding).includes(carriedNamespace(kubernetesObject)), not),
]);

export const mismatchedNamespaceRegex = allPass([
  pipe(nthArg(0), definesNamespaceRegexes),
  pipe((binding, kubernetesObject) =>
    pipe(
      any((regEx: string) => new RegExp(regEx).test(carriedNamespace(kubernetesObject))),
      not,
    )(definedNamespaceRegexes(binding)),
  ),
]);

export const metasMismatch = pipe(
  (defined, carried) => {
    const result = { defined, carried, unalike: {} };

    result.unalike = Object.entries(result.defined)
      .map(([key, value]) => {
        const keyMissing = !Object.hasOwn(result.carried, key);
        const noValue = !value;
        const valMissing = !result.carried[key];
        const valDiffers = result.carried[key] !== result.defined[key];

        // prettier-ignore
        return (
          keyMissing ? { [key]: value } :
          noValue ? {} :
          valMissing ? { [key]: value } :
          valDiffers ? { [key]: value } :
          {}
        )
      })
      .reduce((acc, cur) => ({ ...acc, ...cur }), {});

    return result.unalike;
  },
  unalike => Object.keys(unalike).length > 0,
);

export const mismatchedAnnotations = allPass([
  pipe(nthArg(0), definesAnnotations),
  pipe((binding, kubernetesObject) => metasMismatch(definedAnnotations(binding), carriedAnnotations(kubernetesObject))),
]);

export const mismatchedLabels = allPass([
  pipe(nthArg(0), definesLabels),
  pipe((binding, kubernetesObject) => metasMismatch(definedLabels(binding), carriedLabels(kubernetesObject))),
]);

export const uncarryableNamespace = allPass([
  pipe(nthArg(0), length, gt(__, 0)),
  pipe(nthArg(1), carriesNamespace),
  pipe((namespaceSelector, kubernetesObject) => namespaceSelector.includes(carriedNamespace(kubernetesObject)), not),
]);

export const carriesIgnoredNamespace = allPass([
  pipe(nthArg(0), length, gt(__, 0)),
  pipe(nthArg(1), carriesNamespace),
  pipe((namespaceSelector, kubernetesObject) => namespaceSelector.includes(carriedNamespace(kubernetesObject))),
]);

export const unbindableNamespaces = allPass([
  pipe(nthArg(0), length, gt(__, 0)),
  pipe(nthArg(1), definesNamespaces),
  pipe(
    (namespaceSelector, binding) => difference(definedNamespaces(binding), namespaceSelector),
    length,
    equals(0),
    not,
  ),
]);

export const misboundDeleteWithDeletionTimestamp = allPass([definesDelete, definesDeletionTimestamp]);

export const operationMatchesEvent = anyPass([
  pipe(nthArg(1), equals(Event.Any)),
  pipe((operation, event) => operation === event),
  pipe((operation, event) => (operation ? event.includes(operation) : false)),
]);

export const mismatchedEvent = pipe(
  (binding, request) => operationMatchesEvent(declaredOperation(request), definedEvent(binding)),
  not,
);

export const mismatchedGroup = allPass([
  pipe(nthArg(0), definesGroup),
  pipe((binding, request) => definedGroup(binding) !== declaredGroup(request)),
]);

export const mismatchedVersion = allPass([
  pipe(nthArg(0), definesVersion),
  pipe((binding, request) => definedVersion(binding) !== declaredVersion(request)),
]);

export const mismatchedKind = allPass([
  pipe(nthArg(0), definesKind),
  pipe((binding, request) => definedKind(binding) !== declaredKind(request)),
]);