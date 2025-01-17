import { OLD_VNODE_FIELD } from '.';
import { createElement } from './createElement';
import { VElement, VNode, VProps } from './m';

/**
 * Diffs two VNode props and modifies the DOM node based on the necessary changes
 * @param {HTMLElement} el - Target element to be modified
 * @param {VProps} oldProps - Old VNode props
 * @param {VProps} newProps - New VNode props
 */
export const patchProps = (el: HTMLElement, oldProps: VProps = {}, newProps: VProps = {}): void => {
  if (!oldProps && !newProps) return;

  const oldPropKeys = Object.keys(oldProps);
  const newPropKeys = Object.keys(newProps);

  if ((newProps && !oldProps) || oldPropKeys.length > newPropKeys.length) {
    // Deletion has occured
    for (const propName of oldPropKeys) {
      const newPropValue = newProps[propName];
      /* istanbul ignore if */
      if (newPropValue) {
        if (newPropValue !== oldProps[propName]) el[propName] = newPropValue;
        return;
      }
      delete el[propName];
      el.removeAttribute(propName);
    }
  } else {
    // Addition/No change/Content modification has occured
    for (const propName of newPropKeys) {
      const oldPropValue = oldProps[propName];
      if (oldPropValue) {
        if (oldPropValue !== oldProps[propName]) el[propName] = newProps[propName];
        return;
      }
      el[propName] = newProps[propName];
    }
  }
};

/**
 * Diffs two VNode children and modifies the DOM node based on the necessary changes
 * @param {HTMLElement} el - Target element to be modified
 * @param {VNode[]|undefined} oldVNodeChildren - Old VNode children
 * @param {VNode[]|undefined} newVNodeChildren - New VNode children
 */
export const patchChildren = (
  el: HTMLElement,
  oldVNodeChildren: VNode[] | undefined,
  newVNodeChildren: VNode[] | undefined,
): void => {
  // TODO: Efficient VNode reordering

  const childNodes = [...el.childNodes];
  /* istanbul ignore if */
  if (!newVNodeChildren) {
    // Fastest way to remove all children
    el.textContent = '';
    return;
  }
  if (oldVNodeChildren) {
    for (let i = 0; i < oldVNodeChildren.length; ++i) {
      patch(<HTMLElement | Text>childNodes[i], newVNodeChildren[i], oldVNodeChildren[i]);
    }
  }
  const slicedNewVNodeChildren = newVNodeChildren.slice(oldVNodeChildren?.length ?? 0);
  for (let i = 0; i < slicedNewVNodeChildren.length; ++i) {
    el.appendChild(createElement(slicedNewVNodeChildren[i], false));
  }
};

const replaceElementWithVNode = (el: HTMLElement | Text, newVNode: VNode): HTMLElement | Text => {
  const newElement = createElement(newVNode);
  el.replaceWith(newElement);
  return newElement;
};

/**
 * Diffs two VNodes and modifies the DOM node based on the necessary changes
 * @param {HTMLElement|Text} el - Target element to be modified
 * @param {VNode} newVNode - New VNode
 * @param {VNode=} prevVNode - Previous VNode
 * @returns {HTMLElement|Text}
 */
export const patch = (
  el: HTMLElement | Text,
  newVNode: VNode,
  prevVNode?: VNode,
): HTMLElement | Text => {
  if (!newVNode) {
    el.remove();
    return el;
  }

  const oldVNode: VNode | undefined = prevVNode ?? el[OLD_VNODE_FIELD];
  const hasString = typeof oldVNode === 'string' || typeof newVNode === 'string';

  if (hasString && oldVNode !== newVNode) return replaceElementWithVNode(el, newVNode);
  if (!hasString) {
    if (
      (!(<VElement>oldVNode)?.key && !(<VElement>newVNode)?.key) ||
      (<VElement>oldVNode)?.key !== (<VElement>newVNode)?.key
    ) {
      /* istanbul ignore if */
      if (
        (<VElement>oldVNode)?.tag !== (<VElement>newVNode)?.tag &&
        !(<VElement>newVNode).children &&
        !(<VElement>newVNode).props
      ) {
        // newVNode has no props/children is replaced because it is generally
        // faster to create a empty HTMLElement rather than iteratively/recursively
        // remove props/children
        return replaceElementWithVNode(el, newVNode);
      }
      if (oldVNode && !(el instanceof Text)) {
        patchProps(el, (<VElement>oldVNode).props, (<VElement>newVNode).props);
        patchChildren(el, (<VElement>oldVNode).children, (<VElement>newVNode).children);
      }
    }
  }

  if (!prevVNode) el[OLD_VNODE_FIELD] = newVNode;

  return el;
};
