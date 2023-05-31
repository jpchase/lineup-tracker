/** @format */

import { html } from 'lit';

export const SharedStyles = html`
  <style>
    :host {
      display: block;
      box-sizing: border-box;
    }

    [hidden] {
      display: none !important;
    }

    section {
      padding: 24px;
    }

    section > * {
      max-width: 600px;
      margin-right: auto;
      margin-left: auto;
    }

    h2 {
      font-size: 24px;
      text-align: center;
      color: var(--app-dark-text-color);
    }

    @media (min-width: 460px) {
      h2 {
        font-size: 36px;
      }
    }

    /* Temp to make h3 look like h5, to avoid screenshot changes */
    h3.h5 {
      display: block;
      font-size: 0.83em;
      margin-block-start: 1.67em;
      margin-block-end: 1.67em;
      margin-inline-start: 0px;
      margin-inline-end: 0px;
      font-weight: bold;
    }

    .empty-list {
      text-align: center;
      white-space: nowrap;
      /* color: var(--app-secondary-color); */
    }

    .flex-equal-justified {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    .circle {
      display: block;
      width: 64px;
      height: 64px;
      margin: 0 auto;
      text-align: center;
      border-radius: 50%;
      background: var(--app-primary-color);
      color: var(--app-light-text-color);
      font-size: 30px;
      line-height: 64px;
    }
  </style>
`;
