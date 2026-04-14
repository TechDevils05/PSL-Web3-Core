import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface UpgradePayload {
  eventId: string;
  playerId: string;
  playerName: string;
  newTier: string;
  oldTier: string;
  txHash: string;
  tokenIds: number[];
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string | number }[];
  };
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = 0;

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  // Broadcast when an NFT tier upgrades — frontend animates the card
  broadcastUpgrade(payload: UpgradePayload) {
    this.logger.log(`Broadcasting upgrade: ${payload.playerName} → ${payload.newTier}`);
    this.server.emit('nft:upgraded', payload);
  }

  // Broadcast when a new NFT is minted
  broadcastMint(payload: {
    tokenId: number;
    playerId: string;
    playerName: string;
    tier: string;
    txHash: string;
  }) {
    this.server.emit('nft:minted', payload);
  }

  // Broadcast when an NFT is listed for sale
  broadcastListing(payload: {
    tokenId: number;
    seller: string;
    price: string;
  }) {
    this.server.emit('marketplace:listed', payload);
  }

  // Broadcast when an NFT sells — shows the 85/10/5 split live
  broadcastSale(payload: {
    tokenId: number;
    buyer: string;
    price: string;
    royalty: string;
    platformFee: string;
    txHash: string;
  }) {
    this.server.emit('marketplace:sold', payload);
  }

  // Client can subscribe to a specific player's events
  @SubscribeMessage('subscribe:player')
  handleSubscribePlayer(client: Socket, @MessageBody() playerId: string) {
    client.join(`player:${playerId}`);
    this.logger.log(`Client ${client.id} subscribed to player: ${playerId}`);
  }

  broadcastPlayerUpdate(playerId: string, payload: any) {
    this.server.to(`player:${playerId}`).emit('player:updated', payload);
  }
}
