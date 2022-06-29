import { Register } from '~app-toolkit/decorators';
import { appDefinition, AppDefinition } from '~app/app.definition';
import { AppAction, AppTag, GroupType } from '~app/app.interface';
import { Network } from '~types/network.interface';

export const FRINGE_DEFINITION = appDefinition({
  id: 'fringe',
  name: 'Fringe Finance',
  description: 'A safe place for you to invest and borrow against your holdings. Fast, easily and on your own terms.',
  groups: {
    supply: { id: 'supply', type: GroupType.TOKEN, label: 'Lending', groupLabel: 'Supply' },
    borrow: { id: 'borrow', type: GroupType.POSITION, label: 'Lending', groupLabel: 'Borrow' },
    claimable: { id: 'claimable', type: GroupType.POSITION, label: 'Claimable', isHiddenFromExplore: true },
  },
  presentationConfig: {
    tabs: [
      {
        label: 'Lending',
        viewType: 'split',
        views: [
          {
            viewType: 'list',
            label: 'Supply',
            groupIds: ['supply'],
          },
          {
            viewType: 'list',
            label: 'Borrow',
            groupIds: ['borrow'],
          },
        ],
      },
    ],
  },
  url: 'https://fringe.fi/',
  links: {
    github: 'https://github.com/fringe-finance',
    twitter: 'https://twitter.com/fringefinance',
    telegram: 'https://t.me/fringefinance',
    medium: 'https://fringefinance.medium.com/',
  },
  tags: [AppTag.LENDING],
  supportedNetworks: { [Network.ETHEREUM_MAINNET]: [AppAction.VIEW] },
  primaryColor: '#191919',
});

@Register.AppDefinition(FRINGE_DEFINITION.id)
export class FringeAppDefinition extends AppDefinition {
  constructor() {
    super(FRINGE_DEFINITION);
  }
}
