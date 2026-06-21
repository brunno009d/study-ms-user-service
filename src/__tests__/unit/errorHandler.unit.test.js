import { describe, it, expect, vi, beforeEach } from 'vitest'
import errorHandler from '../../middleware/errorHandler.js'

const makeRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res
}

const makeReq = () => ({ method: 'GET', path: '/test' })

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

describe('errorHandler — middleware', () => {
  it('responde 400 para errores de tipo ValidationError', () => {
    // Arrange
    const err = new Error('campo inválido')
    err.name = 'ValidationError'
    const res = makeRes()
    // Act
    errorHandler(err, makeReq(), res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'validation_error' }))
  })

  it('responde 500 para errores genéricos sin status', () => {
    // Arrange
    const err = new Error('algo salió mal')
    const res = makeRes()
    // Act
    errorHandler(err, makeReq(), res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'internal_error' }))
  })

  it('usa err.status cuando está definido', () => {
    // Arrange
    const err = new Error('not found')
    err.status = 404
    const res = makeRes()
    // Act
    errorHandler(err, makeReq(), res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
