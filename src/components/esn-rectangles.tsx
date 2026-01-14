import React from "react";

export function EsnRectangles() {
    return (
        <div className="flex h-1.5">
            {/* Mobile: 8 rectangles */}
            <div className="flex flex-1 sm:hidden">
                {Array.from({length: 8}).map((_, index) => (
                    <div
                        key={index}
                        className={`flex-1 h-full ${
                            index % 4 === 0 ? 'bg-[#00aeef]' :
                                index % 4 === 1 ? 'bg-[#ec008c]' :
                                    index % 4 === 2 ? 'bg-[#7ac143]' :
                                        'bg-[#f47b20]'
                        }`}
                    ></div>
                ))}
            </div>
            {/* Small: 12 rectangles */}
            <div className="hidden sm:flex md:hidden flex-1">
                {Array.from({length: 12}).map((_, index) => (
                    <div
                        key={index}
                        className={`flex-1 h-full ${
                            index % 4 === 0 ? 'bg-[#00aeef]' :
                                index % 4 === 1 ? 'bg-[#ec008c]' :
                                    index % 4 === 2 ? 'bg-[#7ac143]' :
                                        'bg-[#f47b20]'
                        }`}
                    ></div>
                ))}
            </div>
            {/* Medium: 16 rectangles */}
            <div className="hidden md:flex lg:hidden flex-1">
                {Array.from({length: 16}).map((_, index) => (
                    <div
                        key={index}
                        className={`flex-1 h-full ${
                            index % 4 === 0 ? 'bg-[#00aeef]' :
                                index % 4 === 1 ? 'bg-[#ec008c]' :
                                    index % 4 === 2 ? 'bg-[#7ac143]' :
                                        'bg-[#f47b20]'
                        }`}
                    ></div>
                ))}
            </div>
            {/* Large and above: 24 rectangles */}
            <div className="hidden lg:flex flex-1 gap-0.5">
                {Array.from({length: 24}).map((_, index) => (
                    <div
                        key={index}
                        className={`flex-1 h-full ${
                            index % 4 === 0 ? 'bg-[#00aeef]' :
                                index % 4 === 1 ? 'bg-[#ec008c]' :
                                    index % 4 === 2 ? 'bg-[#7ac143]' :
                                        'bg-[#f47b20]'
                        }`}
                    ></div>
                ))}
            </div>
        </div>
    )
}