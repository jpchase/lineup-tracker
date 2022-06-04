import { LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { LivePlayer } from '../models/game.js';
import { PlayerTimeTracker, PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../models/shift.js';

// The type and interface is required to get the typing to work.
// See https://lit.dev/docs/composition/mixins/#mixins-in-typescript.

type Constructor<T = {}> = new (...args: any[]) => T;

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

    willUpdate(changedProperties: PropertyValues<this>) {
      super.willUpdate(changedProperties);

      if (!changedProperties.has('trackerData')) {
        return;
      }
      const oldValue = changedProperties.get('trackerData');
      if (this.trackerData === oldValue) {
        return;
      }

      this.trackerMap = new PlayerTimeTrackerMap(this.trackerData);
      this.trackerMapReset();
    }

    // Notify that the trackerMap was created, so subclasses can
    // reset any timers, etc.
    protected trackerMapReset() { }

    protected getTracker(player: LivePlayer): PlayerTimeTracker | undefined {
      return this.trackerMap?.get(player?.id);
    }
  };

  return PlayerListClass as unknown as Constructor<PlayerListInterface> & T;
}

export const PlayerListElement = PlayerListMixin(LitElement);
