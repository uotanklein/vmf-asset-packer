include("shared.lua")

SWEP.OldCharge = -1
SWEP.NewCharge = -1
SWEP.AnimStart = 0

function SWEP:Think()
	-- Local player still loading, do nothing
	if ( !IsValid( LocalPlayer() ) ) then return end

	-- TODO: Replace with charge functions
	local totalCharge = 0
	local totalCapacity = 0

	if (ix) then
		local character = LocalPlayer():GetCharacter()
    	if (!character) then return end

		totalCharge = character:GetFlashlightCharge()
		totalCapacity = ix.config.Get("flashlightCapacity")
		-- print(totalCharge, totalCapacity)

		if (totalCapacity == 0) then totalCapacity = 1 end
	end

	-- The values are not initialized yet, do so right now
	if ( oldCharge == -1 and newCharge == -1 ) then
		self.OldCharge = totalCharge
		self.NewCharge = totalCharge
	end

	-- You can use a different smoothing function here
	local smoothCharge = Lerp( ( SysTime() - self.AnimStart ) / 0.5, self.OldCharge, self.NewCharge )

	-- Charge was changed, initialize the animation
	if self.NewCharge ~= totalCharge then
		-- Old animation is still in progress, adjust
		if ( smoothCharge ~= totalCharge ) then
			-- Pretend our current "smooth" position was the target so the animation will
			-- not jump to the old target and start to the new target from there
			self.NewCharge = smoothCharge
		end

		self.OldCharge = self.NewCharge
		self.AnimStart = SysTime()
		self.NewCharge = totalCharge
	end

	smoothCharge = (smoothCharge / totalCapacity) * 100
	smoothCharge = math.Clamp(smoothCharge, 0, 100)
	self.Owner:GetViewModel():SetPoseParameter( "needle", smoothCharge )
	self.Owner:GetViewModel():InvalidateBoneCache()
end