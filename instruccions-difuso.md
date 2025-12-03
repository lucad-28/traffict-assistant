
El siguiente es un ejemplo del analisis difuso que se tenia anteriormente. 
{/* Fuzzy Classification Results */}
            {prediction &&
              selectedStation &&
              prediction.fuzzy_classification && (
                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Análisis Difuso
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <div className="p-2 group-data-[collapsible=icon]:hidden">
                      <div className="text-xs text-muted-foreground mb-1">
                        {currentSequence && currentSequence.length > 0 ? (
                          <>
                            A las{" "}
                            {new Date(
                              currentSequence[
                                currentSequence.length - 1
                              ].timestamp.getTime() +
                                5 * 60 * 1000
                            ).toLocaleTimeString()}{" "}
                            el tráfico será:
                          </>
                        ) : (
                          "Dentro de 5 min el tráfico será:"
                        )}
                      </div>
                    </div>
                  </SidebarGroupContent>
                  <SidebarGroupContent>
                    <div className="p-2 space-y-3 group-data-[collapsible=icon]:space-y-1">
                      <div className="group-data-[collapsible=icon]:hidden space-y-2">
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="text-xs text-muted-foreground">
                            SPI Predicted
                          </div>
                          <div className="text-lg font-bold">
                            {prediction.spi_predicted.toFixed(3)}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="text-xs text-muted-foreground">
                            Status
                          </div>
                          <div className="text-sm font-medium">
                            {prediction.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SidebarGroupContent>

                  <SidebarGroupContent>
                    <div className="p-2 space-y-4 group-data-[collapsible=icon]:hidden">
                      {/* A. Descripción Lingüística */}
                      <div className="linguistic-description">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p>
                            {prediction.traffic_state ||
                              prediction.fuzzy_classification
                                .linguistic_description}
                          </p>
                        </div>
                      </div>

                      {/* B. Nivel de Confianza */}
                      <div className="confidence-badge">
                        <span className="label">Confianza:</span>
                        <span
                          className={`badge badge-${
                            prediction.confidence_level || "medium"
                          }`}
                        >
                          {predictionApi.getConfidenceLabel(
                            prediction.confidence_level || "medium"
                          )}
                        </span>
                      </div>

                      {/* C. Gráfico de Barras de Pertenencia */}
                      {prediction.fuzzy_classification.ranked_categories &&
                        prediction.fuzzy_classification.ranked_categories
                          .length > 0 && (
                          <div className="membership-chart">
                            <h4>Grados de Pertenencia:</h4>
                            {prediction.fuzzy_classification.ranked_categories.map(
                              (category, index) => (
                                <div key={index} className="membership-bar">
                                  <div className="bar-label">
                                    <span className="category-name">
                                      {category.label}
                                    </span>
                                    <span className="membership-value">
                                      {Math.round(category.membership * 100)}%
                                    </span>
                                  </div>
                                  <div className="bar-container">
                                    <div
                                      className="bar-fill"
                                      style={{
                                        width: `${category.membership * 100}%`,
                                        backgroundColor: category.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}

                      {/* D. Indicador de Estado de Transición */}
                      {prediction.fuzzy_classification.is_transition_state && (
                        <div className="transition-alert">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-yellow-800">
                                Estado de Transición Detectado
                              </span>
                              <p className="transition-note">
                                El tráfico presenta características de múltiples
                                estados.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

Los datos necesarios para realizar esta presentacion del analisis difuso son retirbuidos por el mcp-server (traffict-mcp-server/server)
quiero que ahora en el traffict-bot (frontend) cuando se muestre un mapa y se haga click en una estacion, ademas de presentar el spi, el comentario y demas, tambien se presente el analisis digfuso que se muestra anteriormente