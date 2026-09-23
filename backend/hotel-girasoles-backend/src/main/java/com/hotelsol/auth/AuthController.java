package com.hotelsol.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request
    ) {

        if (request.getUsername() == null ||
                request.getPassword() == null) {

            return ResponseEntity
                    .badRequest()
                    .body("Usuario y contraseña son obligatorios.");
        }

        User user = userRepository
                .findByUsername(request.getUsername().trim())
                .orElse(null);

        if (user == null ||
                !passwordEncoder.matches(
                        request.getPassword(),
                        user.getPassword()
                )) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Usuario o contraseña incorrectos.");
        }

        String token = jwtService.generateToken(user);

        return ResponseEntity.ok(
                new LoginResponse(
                        token,
                        user.getUsername(),
                        user.getRole().name()
                )
        );
    }

    @PostMapping("/reception")
    public ResponseEntity<LoginResponse> reception() {

        return ResponseEntity.ok(
                new LoginResponse(
                        "RECEPTION_ACCESS",
                        "Recepción",
                        "RECEPCION"
                )
        );
    }
}
