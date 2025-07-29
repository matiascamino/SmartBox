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
  fontFamily: "'Orbitron', Arial, sans-serif", // Aplica Orbitron al modal
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

    // Validaciones básicas
    if (oldPin.length === 0 || newPin.length === 0) {
      setError('Por favor completa ambos campos')
      return
    }

    try {
      // Aquí harías el fetch a tu backend para cambiar el PIN
      const res = await fetch('http://localhost:3000/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Error al cambiar PIN')

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
        className="button-glow"
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

      <Modal open={open} onClose={handleClose} aria-labelledby="modal-cambiar-pin">
        <Box sx={style} component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" component="h2" mb={2} sx={{ fontFamily: "'Orbitron', Arial, sans-serif" }}>
            Cambiar PIN
          </Typography>

          <TextField
            label="PIN actual"
            variant="filled"
            type="password"
            value={oldPin}
            onChange={e => setOldPin(e.target.value)}
            required
            inputProps={{
              maxLength: 10,
              style: { fontFamily: "'Orbitron', Arial, sans-serif", color: '#fff' }
            }}
            InputLabelProps={{
              style: { color: '#fff' }
            }}
            fullWidth
          />

          <TextField
            label="Nuevo PIN"
            variant="filled"
            type="password"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            required
            inputProps={{
              maxLength: 10,
              style: { fontFamily: "'Orbitron', Arial, sans-serif", color: '#fff' }
            }}
            InputLabelProps={{
              style: { color: '#fff' }
            }}
            fullWidth
          />

          {error && (
            <Typography color="error" variant="body2" mt={1} sx={{ fontFamily: "'Orbitron', Arial, sans-serif" }}>
              {error}
            </Typography>
          )}

          {success && (
            <Typography color="success.main" variant="body2" mt={1} sx={{ fontFamily: "'Orbitron', Arial, sans-serif" }}>
              {success}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            className="button-glow"
            sx={{
              mt: 2,
              backgroundColor: 'var(--accent)',
              color: '#000',
              fontWeight: 'bold',
              boxShadow: '0 0 12px var(--accent)',
              borderRadius: 2,
              letterSpacing: 1,
              fontFamily: "'Orbitron', Arial, sans-serif",
              '&:hover': {
                backgroundColor: '#00e5a0',
                boxShadow: '0 0 18px var(--accent)',
              },
            }}
          >
            Cambiar
          </Button>
        </Box>
      </Modal>
    </>
  )
}
