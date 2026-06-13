import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() corre ANTES del hoisting de vi.mock(), garantizando que
// mockSupabase exista cuando la fábrica de vi.mock() se ejecuta.
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    admin: {
      createUser:  vi.fn(),
      deleteUser:  vi.fn(),
    },
    signInWithPassword: vi.fn(),
  },
}))

// Mockeamos la librería completa, no el archivo de config.
// Así interceptamos el require('@supabase/supabase-js') en supabase.js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import {
  createAuthUser,
  loginUser,
  getStudentProfile,
  updateStudentProfile,
  deleteAuthUser,
} from '../../repository/userRepository.js'

// Helper: cadena de query encadenable que resuelve con finalValue
const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'delete', 'eq', 'order', 'is', 'in', 'gte', 'lte'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

// ─── createAuthUser ────────────────────────────────────────────────────────

describe('userRepository — createAuthUser', () => {
  it('retorna el usuario creado cuando Supabase responde sin error', async () => {
    // Arrange
    const fakeUser = { id: 'u1', email: 'ana@test.com' }
    mockSupabase.auth.admin.createUser.mockResolvedValue({ data: { user: fakeUser }, error: null })

    // Act
    const result = await createAuthUser('ana@test.com', 'password123', 'Ana López')

    // Assert
    expect(result).toEqual(fakeUser)
    expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'ana@test.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Ana López' },
    })
  })

  it('lanza el error cuando Supabase falla al crear usuario', async () => {
    // Arrange
    const dbError = new Error('Email ya registrado')
    mockSupabase.auth.admin.createUser.mockResolvedValue({ data: null, error: dbError })

    // Act & Assert
    await expect(createAuthUser('ana@test.com', 'pass', 'Ana')).rejects.toThrow('Email ya registrado')
  })
})

// ─── loginUser ─────────────────────────────────────────────────────────────

describe('userRepository — loginUser', () => {
  it('retorna data de sesión en login exitoso', async () => {
    // Arrange
    const fakeSession = { session: { token: 'jwt-abc' }, user: { id: 'u1' } }
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: fakeSession, error: null })

    // Act
    const result = await loginUser('ana@test.com', 'password123')

    // Assert
    expect(result).toEqual(fakeSession)
  })

  it('lanza el error cuando las credenciales son inválidas', async () => {
    // Arrange
    const authError = new Error('Invalid login credentials')
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: authError })

    // Act & Assert
    await expect(loginUser('x@test.com', 'wrong')).rejects.toThrow('Invalid login credentials')
  })
})

// ─── getStudentProfile ─────────────────────────────────────────────────────

describe('userRepository — getStudentProfile', () => {
  it('retorna el perfil cuando el estudiante existe', async () => {
    // Arrange
    const fakeProfile = { id: 'u1', full_name: 'Ana López', email: 'ana@test.com' }
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeProfile, error: null }))

    // Act
    const result = await getStudentProfile('u1')

    // Assert
    expect(result).toEqual(fakeProfile)
    expect(mockSupabase.from).toHaveBeenCalledWith('student')
  })

  it('lanza el error de Supabase cuando falla la consulta', async () => {
    // Arrange
    const dbError = new Error('BD no disponible')
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: dbError }))

    // Act & Assert
    await expect(getStudentProfile('u1')).rejects.toThrow('BD no disponible')
  })
})

// ─── updateStudentProfile ──────────────────────────────────────────────────

describe('userRepository — updateStudentProfile', () => {
  it('retorna el perfil actualizado', async () => {
    // Arrange
    const updated = { id: 'u1', full_name: 'Ana López Gomez' }
    mockSupabase.from.mockReturnValue(mockChain({ data: updated, error: null }))

    // Act
    const result = await updateStudentProfile('u1', { full_name: 'Ana López Gomez' })

    // Assert
    expect(result).toEqual(updated)
  })

  it('lanza el error cuando la actualización falla', async () => {
    // Arrange
    const dbError = new Error('Registro no encontrado')
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: dbError }))

    // Act & Assert
    await expect(updateStudentProfile('u1', {})).rejects.toThrow('Registro no encontrado')
  })
})

// ─── deleteAuthUser ────────────────────────────────────────────────────────

describe('userRepository — deleteAuthUser', () => {
  it('resuelve sin errores cuando la eliminación es exitosa', async () => {
    // Arrange
    mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null })

    // Act & Assert
    await expect(deleteAuthUser('u1')).resolves.not.toThrow()
  })

  it('lanza el error cuando Supabase falla al eliminar', async () => {
    // Arrange
    const dbError = new Error('Usuario no encontrado')
    mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: dbError })

    // Act & Assert
    await expect(deleteAuthUser('u1')).rejects.toThrow('Usuario no encontrado')
  })
})
