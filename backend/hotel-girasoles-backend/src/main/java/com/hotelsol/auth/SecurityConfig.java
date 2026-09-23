package com.hotelsol.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /**
         * CORS
         *
         * Permite que Angular local y el frontend publicado
         * puedan comunicarse con Spring Boot.
         */
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(
                                List.of(
                                                "http://localhost:4200",
                                                "https://hotelgirasoles.rousromani-07.workers.dev"));

                configuration.setAllowedMethods(
                                List.of(
                                                "GET",
                                                "POST",
                                                "PUT",
                                                "PATCH",
                                                "DELETE",
                                                "OPTIONS"));

                configuration.setAllowedHeaders(
                                List.of("*"));

                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                                "/**",
                                configuration);

                return source;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                http
                                // =====================================
                                // CSRF
                                // =====================================
                                .csrf(csrf -> csrf.disable())

                                // =====================================
                                // CORS
                                // =====================================
                                .cors(cors -> cors.configurationSource(
                                                corsConfigurationSource()))

                                // =====================================
                                // API REST SIN SESIÓN
                                // =====================================
                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                .authorizeHttpRequests(auth -> auth

                                                // =====================================
                                                // LOGIN
                                                // =====================================
                                                .requestMatchers(
                                                                "/api/auth/login",
                                                                "/api/auth/reception")
                                                .permitAll()

                                                // =====================================
                                                // PRE-FLIGHT CORS
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.OPTIONS,
                                                                "/**")
                                                .permitAll()

                                                // =====================================
                                                // PRODUCTOS - CONSULTA
                                                //
                                                // ADMIN + RECEPCIÓN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/api/products",
                                                                "/api/products/**")
                                                .permitAll()

                                                // =====================================
                                                // CONSUMO PERSONAL
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/api/products/*/stock/decrease")
                                                .permitAll()

                                                // =====================================
                                                // HABITACIONES - CONSULTA
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/api/rooms",
                                                                "/api/rooms/**")
                                                .permitAll()

                                                // =====================================
                                                // HABITACIONES - CAMBIO DE ESTADO
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/api/rooms/*/status")
                                                .permitAll()

                                                // =====================================
                                                // HABITACIONES - CREAR
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/api/rooms",
                                                                "/api/rooms/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // HABITACIONES - EDITAR
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.PUT,
                                                                "/api/rooms/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // HABITACIONES - ELIMINAR
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.DELETE,
                                                                "/api/rooms/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // CREAR PRODUCTOS
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/api/products",
                                                                "/api/products/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // EDITAR PRODUCTOS
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.PUT,
                                                                "/api/products/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // AUMENTAR STOCK
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/api/products/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // ELIMINAR PRODUCTOS
                                                // SOLO ADMIN
                                                // =====================================
                                                .requestMatchers(
                                                                HttpMethod.DELETE,
                                                                "/api/products/**")
                                                .hasRole("ADMIN")

                                                // =====================================
                                                // RESTO
                                                // =====================================
                                                .anyRequest()
                                                .permitAll());

                // Registrar el filtro JWT antes del filtro de autenticacion
                // estandar de Spring Security
                http.addFilterBefore(
                                jwtAuthenticationFilter,
                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        CommandLineRunner createDefaultAdmin(
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder) {

                return args -> {

                        if (userRepository
                                        .findByUsername("admin")
                                        .isEmpty()) {

                                User admin = new User(
                                                "admin",
                                                passwordEncoder.encode("admin123"),
                                                Role.ADMIN);

                                userRepository.save(admin);

                                System.out.println(
                                                "========================================");

                                System.out.println(
                                                " USUARIO ADMIN CREADO");

                                System.out.println(
                                                " Usuario: admin");

                                System.out.println(
                                                " Contraseña: admin123");

                                System.out.println(
                                                "========================================");
                        }
                };
        }
}