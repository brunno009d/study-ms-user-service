import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/userService.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteAccount: vi.fn(),
}))

import * as userService from '../../service/userService.js'
import { getProfile, updateProfile, deleteProfile } from '../../controller/userController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getProfile ──────────────────────────────────────────────────────────────

describe('userController — getProfile', () => {
  it('responde 200 con el perfil del usuario', async () => {
    // Arrange
    const profile = { id: 'u1', full_name: 'Ana' }
    userService.getProfile.mockResolvedValue(profile)
    const req = { userId: 'u1' }
    const res = mockRes()
    // Act
    await getProfile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(profile)
  })

  it('responde 404 cuando el service lanza el código PGRST116', async () => {
    // Arrange
    const err = new Error('Not found')
    err.code = 'PGRST116'
    userService.getProfile.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await getProfile(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_found' }))
  })

  it('delega a next en errores no manejados', async () => {
    const err = new Error('DB error')
    userService.getProfile.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = mockRes()
    const next = vi.fn()
    await getProfile(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── updateProfile ───────────────────────────────────────────────────────────

describe('userController — updateProfile', () => {
  it('responde 400 cuando el body está vacío', async () => {
    const req = { userId: 'u1', body: {} }
    const res = mockRes()
    await updateProfile(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 400 cuando el service lanza error de validación (status 400)', async () => {
    // Arrange
    const err = new Error('No se proporcionaron campos válidos')
    err.status = 400
    userService.updateProfile.mockRejectedValue(err)
    const req = { userId: 'u1', body: { campo_invalido: 'x' } }
    const res = mockRes()
    // Act
    await updateProfile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'bad_request' }))
  })

  it('responde 404 cuando el service lanza error de perfil no encontrado (status 404)', async () => {
    // Arrange
    const err = new Error('Perfil no encontrado')
    err.status = 404
    userService.updateProfile.mockRejectedValue(err)
    const req = { userId: 'u1', body: { full_name: 'Bob' } }
    const res = mockRes()
    // Act
    await updateProfile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_found' }))
  })

  it('delega a next cuando el error no es 400 ni 404', async () => {
    // Arrange — error genérico sin status definido → statusCode = 500
    const err = new Error('error interno')
    userService.updateProfile.mockRejectedValue(err)
    const req = { userId: 'u1', body: { full_name: 'Bob' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await updateProfile(req, res, next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })

  it('responde 200 con el perfil actualizado', async () => {
    // Arrange
    const updated = { id: 'u1', full_name: 'Bob' }
    userService.updateProfile.mockResolvedValue(updated)
    const req = { userId: 'u1', body: { full_name: 'Bob' } }
    const res = mockRes()
    // Act
    await updateProfile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(updated)
  })
})

// ─── deleteProfile ───────────────────────────────────────────────────────────

describe('userController — deleteProfile', () => {
  it('responde 204 cuando la cuenta es eliminada', async () => {
    userService.deleteAccount.mockResolvedValue(undefined)
    const req = { userId: 'u1' }
    const res = mockRes()
    await deleteProfile(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })

  it('responde 404 cuando el service lanza error de cuenta no encontrada (status 404)', async () => {
    // Arrange
    const err = new Error('Cuenta no encontrada')
    err.status = 404
    userService.deleteAccount.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = mockRes()
    // Act
    await deleteProfile(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'not_found' }))
  })

  it('delega a next en errores inesperados', async () => {
    const err = new Error('unexpected')
    userService.deleteAccount.mockRejectedValue(err)
    const req = { userId: 'u1' }
    const res = mockRes()
    const next = vi.fn()
    await deleteProfile(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})
