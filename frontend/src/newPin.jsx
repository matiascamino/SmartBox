import React, { useState } from 'react'
import { Button, Modal, Box, TextField, Typography } from '@mui/material'

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 320,
  bgcolor: '#1E1E2F',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontFamily: "'Orbitron', Arial, sans-serif",
}

export default function ChangePinModal() {
  const [open, setOpen] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleOpen = () => setOpen(true)
  const handleClose = () => {
    setOpen(false)
    setOldPin('')
    setNewPin('')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (oldPin.length === 0 || newPin.length === 0) {
      setError('Por favor completa ambos campos')
      return
    }

    const nombreUsuario = localStorage.getItem('usuario')
    if (!nombreUsuario) {
      setError('Usuario no encontrado. Por favor inicia sesión de nuevo.')
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario: nombreUsuario, oldPin, newPin }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al cambiar PIN')

      setSuccess('PIN cambiado con éxito')
      setOldPin('')
      setNewPin('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <Button
        variant="contained"
        style={{
          backgroundColor: 'var(--accent)',
          color: '#000',
          fontWeight: 'bold',
          boxShadow: '0 0 12px var(--accent)',
          borderRadius: 8,
          letterSpacing: 1,
          fontFamily: "'Orbitron', Arial, sans-serif",
        }}
        onClick={handleOpen}
      >
        Cambiar PIN
      </Button>

      <Modal open={open} onClose={handleClose}>
        <Box sx={style} component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" mb={2}>
            Cambiar PIN
          </Typography>

          <TextField
            label="PIN actual"
            variant="filled"
            type="password"
            value={oldPin}
            onChange={e => setOldPin(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Nuevo PIN"
            variant="filled"
            type="password"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            required
            fullWidth
          />

          {error && <Typography color="error" mt={1}>{error}</Typography>}
          {success && <Typography color="success.main" mt={1}>{success}</Typography>}

          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            Cambiar
          </Button>
        </Box>
      </Modal>
    </>
  )
}
