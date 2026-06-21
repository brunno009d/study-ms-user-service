import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/userService.js', () => ({
  getProfile: vi.fn(),
}))

import * as userService from '../../service/userService.js'
import { getContext } from '../../controller/aiContextController.js'

const makeRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getContext ────────────────────────────────────────────────────────────────

describe('aiContextController — getContext', () => {
  it('200 — retorna el perfil del estudiante cuando existe', async () => {
    // Arrange
    const profile = { id: 'u1', full_name: 'Ana' }
    userService.getProfile.mockResolvedValue(profile)
    const req = { userId: 'u1' }
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(profile)
  })

  it('200 null — retorna null cuando el código de error es PGRST116', async () => {
    // Arrange
    const err = new Error('not found')
    err.code = 'PGRST116'
    userService.getProfile.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(null)
  })

  it('delega a next en errores inesperados', async () => {
    // Arrange
    const err = new Error('DB crash')
    userService.getProfile.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = makeRes()
    const next = vi.fn()
    // Act
    await getContext(req, res, next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })
})
