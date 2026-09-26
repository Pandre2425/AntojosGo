// Compatibility exports for earlier imports. New consumers use the owning module.
export { ensureAccountProfile } from '../modules/accounts/data/account-profile'
export { loadBusinessProfile, saveBusinessProfile, listOwnedRestaurants, createOwnedRestaurant } from '../modules/restaurants/data/owned-restaurants'
export type { AccountProfile } from '../shared/contracts/accounts'
export type { OwnedRestaurant, BusinessProfile } from '../shared/contracts/restaurants'
