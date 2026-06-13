import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/userRepository.js', () => ({
  createAuthUser: vi.fn(),
  loginUser: vi.fn(),
  getStudentProfile: vi.fn(),
  updateStudentProfile: vi.fn(),
  deleteAuthUser: vi.fn(),
}))

import * as userRepository from '../../repository/userRepository.js'
import * as userService from '../../service/userService.js'

beforeEach(() => vi.clearAllMocks())

// ─── register ────────────────────────────────────────────────────────────────

describe('userService — register', () => {
  it('lanza 400 si falta el email', async () => {
    // Arrange / Act
    const err = await userService.register('', 'pass123', 'Ana').catch(e => e)
    // Assert
    expect(err.status).toBe(400)
    expect(err.message).toMatch(/email/i)
  })

  it('lanza 400 si falta la contraseña', async () => {
    const err = await userService.register('a@b.com', '', 'Ana').catch(e => e)
    expect(err.status).toBe(400)
    expect(err.message).toMatch(/contraseña/i)
  })

  it('lanza 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const err = await userService.register('a@b.com', '123', 'Ana').catch(e => e)
    expect(err.status).toBe(400)
    expect(err.message).toMatch(/6 caracteres/i)
  })

  it('lanza 400 si el fullName está vacío o solo espacios', async () => {
    const err = await userService.register('a@b.com', 'pass123', '   ').catch(e => e)
    expect(err.status).toBe(400)
    expect(err.message).toMatch(/nombre/i)
  })

  it('retorna id, email y full_name cuando los datos son válidos', async () => {
    // Arrange
    userRepository.createAuthUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' })
    // Act
    const result = await userService.register('a@b.com', 'pass123', '  Ana  ')
    // Assert
    expect(result).toEqual({ id: 'u1', email: 'a@b.com', full_name: 'Ana' })
    expect(userRepository.createAuthUser).toHaveBeenCalledWith('a@b.com', 'pass123', 'Ana')
  })
})

// ─── login ───────────────────────────────────────────────────────────────────

describe('userService — login', () => {
  it('lanza 400 si falta el email', async () => {
    const err = await userService.login('', 'pass123').catch(e => e)
    expect(err.status).toBe(400)
  })

  it('lanza 400 si falta la contraseña', async () => {
    const err = await userService.login('a@b.com', '').catch(e => e)
    expect(err.status).toBe(400)
  })

  it('retorna user y session formateados cuando las credenciales son válidas', async () => {
    // Arrange
    userRepository.loginUser.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      session: { access_token: 'tok', refresh_token: 'rtok', expires_at: 9999 },
    })
    // Act
    const result = await userService.login('a@b.com', 'pass123')
    // Assert
    expect(result.user).toEqual({ id: 'u1', email: 'a@b.com' })
    expect(result.session).toEqual({ access_token: 'tok', refresh_token: 'rtok', expires_at: 9999 })
  })
})

// ─── getProfile ──────────────────────────────────────────────────────────────

describe('userService — getProfile', () => {
  it('delega al repository y retorna el perfil', async () => {
    // Arrange
    const profile = { id: 'u1', full_name: 'Ana' }
    userRepository.getStudentProfile.mockResolvedValue(profile)
    // Act
    const result = await userService.getProfile('u1')
    // Assert
    expect(result).toEqual(profile)
    expect(userRepository.getStudentProfile).toHaveBeenCalledWith('u1')
  })
})

// ─── updateProfile ───────────────────────────────────────────────────────────

describe('userService — updateProfile', () => {
  it('lanza 400 si no se pasan campos válidos', async () => {
    const err = await userService.updateProfile('u1', { invalid_field: 'x' }).catch(e => e)
    expect(err.status).toBe(400)
    expect(err.message).toMatch(/campos válidos/i)
  })

  it('filtra campos no permitidos y llama al repository solo con los permitidos', async () => {
    // Arrange
    userRepository.updateStudentProfile.mockResolvedValue({ id: 'u1', full_name: 'Bob' })
    // Act
    const result = await userService.updateProfile('u1', {
      full_name: 'Bob',
      avatar_url: 'http://img',
      hacked_field: 'evil',
    })
    // Assert
    expect(userRepository.updateStudentProfile).toHaveBeenCalledWith('u1', {
      full_name: 'Bob',
      avatar_url: 'http://img',
    })
    expect(result).toEqual({ id: 'u1', full_name: 'Bob' })
  })

  it('acepta theme_color como campo permitido', async () => {
    userRepository.updateStudentProfile.mockResolvedValue({ id: 'u1', theme_color: '#fff' })
    await userService.updateProfile('u1', { theme_color: '#fff' })
    expect(userRepository.updateStudentProfile).toHaveBeenCalledWith('u1', { theme_color: '#fff' })
  })
})

// ─── deleteAccount ───────────────────────────────────────────────────────────

describe('userService — deleteAccount', () => {
  it('llama al repository y retorna mensaje de confirmación', async () => {
    // Arrange
    userRepository.deleteAuthUser.mockResolvedValue(undefined)
    // Act
    const result = await userService.deleteAccount('u1')
    // Assert
    expect(userRepository.deleteAuthUser).toHaveBeenCalledWith('u1')
    expect(result).toEqual({ message: 'Cuenta eliminada exitosamente' })
  })
})
