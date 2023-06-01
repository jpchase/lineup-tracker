/** @format */

import { DocumentData } from 'firebase/firestore';
import { Player, PlayerStatus } from '../../models/player.js';
import { ModelConverter } from '../../storage/model-converter.js';

export const playerConverter: ModelConverter<Player> = {
  fromDocument: (id: string, data: DocumentData) => {
    return {
      id,
      name: data.name,
      uniformNumber: data.uniformNumber,
      positions: data.positions || [],
      status: data.status,
    };
  },

  toDocument: (player) => {
    const data: DocumentData = {
      ...player,
    };
    if (!player.status) {
      data.status = PlayerStatus.Off;
    }
    if (!player.positions) {
      data.positions = [];
    }
    return data;
  },
};
