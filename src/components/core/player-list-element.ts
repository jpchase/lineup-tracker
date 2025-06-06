/** @format */

import { LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { LivePlayer } from '../../models/live.js';
import {
  PlayerTimeTracker,
  PlayerTimeTrackerMap,
  PlayerTimeTrackerMapData,
} from '../../models/shift.js';
import { Constructor } from '../../util/shared-types.js';

// The type and interface is required to get the typing to work.
// See https://lit.dev/docs/composition/mixins/#mixins-in-typescript.

export declare class PlayerListInterface {
  trackerData?: PlayerTimeTrackerMapData;
  protected getTracker(player: LivePlayer): PlayerTimeTracker | undefined;
  protected trackerMapReset(): void;
}

export const PlayerListMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class PlayerListClass extends superClass {
    protected trackerMap?: PlayerTimeTrackerMap;

    // @property({ type: Array })
    // players: LivePlayer[] = [];

    @property({ type: Object })
    public trackerData?: PlayerTimeTrackerMapData;

    override willUpdate(changedProperties: PropertyValues<this>) {
      super.willUpdate(changedProperties);

      if (!changedProperties.has('trackerData')) {
        return;
      }
      const oldValue = changedProperties.get('trackerData');
      if (this.trackerData === oldValue) {
        return;
      }

      this.trackerMap = this.trackerData
        ? PlayerTimeTrackerMap.create(this.trackerData)
        : undefined;
      this.trackerMapReset();
    }

    // Notify that the trackerMap was created, so subclasses can
    // reset any timers, etc.
    protected trackerMapReset() {}

    protected getTracker(player: LivePlayer): PlayerTimeTracker | undefined {
      return this.trackerMap?.get(player?.id);
    }
  }

  return PlayerListClass as unknown as Constructor<PlayerListInterface> & T;
};

export const PlayerListElement = PlayerListMixin(LitElement);
