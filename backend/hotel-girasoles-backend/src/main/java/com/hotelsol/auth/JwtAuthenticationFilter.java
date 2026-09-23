package com.hotelsol.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtro JWT.
 *
 * Lee el header Authorization: Bearer <token>,
 * valida el JWT con JwtService y carga el SecurityContext
 * con las autoridades del usuario para que Spring Security
 * pueda evaluar hasRole("ADMIN") correctamente.
 *
 * Spring Security requiere que las autoridades tengan el
 * prefijo ROLE_ cuando se usa hasRole("ADMIN"), por lo que
 * el claim "role" del JWT (valor: "ADMIN") se convierte a
 * "ROLE_ADMIN" antes de registrarlo en el contexto.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Si no hay header o no empieza con "Bearer ", continua sin autenticar
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // Validar el token
        if (!jwtService.isValid(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extraer el rol del claim "role" (p.ej. "ADMIN")
        String role = jwtService.extractRole(token);
        String username = jwtService.extractUsername(token);

        // Spring Security requiere el prefijo ROLE_ para hasRole()
        String springRole = "ROLE_" + role;

        List<SimpleGrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority(springRole));

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        authorities
                );

        // Cargar el contexto de seguridad
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
