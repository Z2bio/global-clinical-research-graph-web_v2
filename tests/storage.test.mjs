import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearAllLocalData,
  getCachedResponse,
  getFavorites,
  removeFavorite,
  saveCachedResponse,
  saveFavorite
} from '../assets/js/storage.js'

test('storage falls back safely when browser localStorage is unavailable', () => {
  clearAllLocalData()
  saveCachedResponse('test-key', { studies: [{ nctId: 'NCT01234567' }] })
  const cached = getCachedResponse('test-key')
  assert.equal(cached.payload.studies[0].nctId, 'NCT01234567')

  saveFavorite({ nctId: 'NCT01234567', statusCode: 'RECRUITING' })
  assert.equal(Object.keys(getFavorites()).length, 1)
  removeFavorite('NCT01234567')
  assert.equal(Object.keys(getFavorites()).length, 0)
  clearAllLocalData()
})
